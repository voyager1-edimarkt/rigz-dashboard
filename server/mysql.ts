import mysql from "mysql2/promise";
import { Client as SSHClient } from "ssh2";
import net from "net";
import { log } from "./index";

let sshClient: SSHClient | null = null;
let localPort: number = 0;
let tunnelServer: net.Server | null = null;
let tunnelReady = false;

interface TunnelConfig {
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshPrivateKey: string;
  mysqlHost: string;
  mysqlPort: number;
}

function getConfig() {
  return {
    sshHost: process.env.SSH_HOST || "54.161.236.27",
    sshPort: parseInt(process.env.SSH_PORT || "22"),
    sshUser: process.env.SSH_USER || "ec2-user",
    sshPrivateKey: process.env.SSH_PRIVATE_KEY || "",
    mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
    mysqlPort: parseInt(process.env.MYSQL_PORT || "3306"),
    mysqlUser: process.env.MYSQL_USER || "runtime",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDatabase: process.env.MYSQL_DATABASE || "data",
  };
}

function ensureTunnel(): Promise<number> {
  if (tunnelReady && localPort && sshClient) {
    return Promise.resolve(localPort);
  }

  return createSSHTunnel(getConfig());
}

function createSSHTunnel(config: TunnelConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    if (sshClient) {
      try { sshClient.end(); } catch {}
    }
    if (tunnelServer) {
      try { tunnelServer.close(); } catch {}
    }
    tunnelReady = false;

    sshClient = new SSHClient();

    sshClient.on("ready", () => {
      log("SSH connection established", "ssh");

      tunnelServer = net.createServer((sock) => {
        sshClient!.forwardOut(
          "127.0.0.1",
          0,
          config.mysqlHost,
          config.mysqlPort,
          (err, stream) => {
            if (err) {
              sock.end();
              return;
            }
            sock.pipe(stream).pipe(sock);
          }
        );
      });

      tunnelServer.listen(0, "127.0.0.1", () => {
        const address = tunnelServer!.address() as net.AddressInfo;
        localPort = address.port;
        tunnelReady = true;
        log(`SSH tunnel established on local port ${localPort}`, "ssh");
        resolve(localPort);
      });

      tunnelServer.on("error", (err) => {
        reject(err);
      });
    });

    sshClient.on("error", (err) => {
      log(`SSH error: ${err.message}`, "ssh");
      tunnelReady = false;
      reject(err);
    });

    sshClient.on("close", () => {
      log("SSH connection closed", "ssh");
      tunnelReady = false;
    });

    let privateKey = config.sshPrivateKey;
    if (privateKey && !privateKey.includes("\n")) {
      privateKey = privateKey.replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "-----BEGIN $1PRIVATE KEY-----\n");
      privateKey = privateKey.replace(/-----END (RSA )?PRIVATE KEY-----/, "\n-----END $1PRIVATE KEY-----\n");
      privateKey = privateKey.replace(/(.{64})(?!-)/g, "$1\n");
    }

    sshClient.connect({
      host: config.sshHost,
      port: config.sshPort,
      username: config.sshUser,
      privateKey: Buffer.from(privateKey),
      readyTimeout: 30000,
      keepaliveInterval: 10000,
    });
  });
}

export async function query(sql: string, params?: any[], database?: string): Promise<any> {
  const config = getConfig();
  const port = await ensureTunnel();

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: database || undefined,
    connectTimeout: 30000,
  });

  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

export async function queryNoDb(sql: string, params?: any[]): Promise<any> {
  return query(sql, params, undefined);
}

export async function testConnection(): Promise<{ connected: boolean; host: string; database: string; error?: string }> {
  const config = getConfig();
  try {
    await queryNoDb("SELECT 1");
    return {
      connected: true,
      host: config.sshHost,
      database: config.mysqlDatabase,
    };
  } catch (err: any) {
    return {
      connected: false,
      host: config.sshHost,
      database: config.mysqlDatabase,
      error: err.message,
    };
  }
}

export async function cleanup() {
  if (tunnelServer) {
    tunnelServer.close();
    tunnelServer = null;
  }
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  tunnelReady = false;
}
