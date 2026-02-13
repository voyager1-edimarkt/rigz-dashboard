import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, LayoutDashboard } from "lucide-react";
import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

const US_TOPO_URL = "/states-10m.json";
const CA_GEO_URL = "/canada-provinces.json";

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

const PROVINCE_NAME_TO_ABBR: Record<string, string> = {
  "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB",
  "New Brunswick": "NB", "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT", "Nova Scotia": "NS", "Nunavut": "NU",
  "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
  "Saskatchewan": "SK", "Yukon Territory": "YT",
};

interface CustomerStats {
  total: number;
  parentAccounts: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
  byProvince: { province: string; cnt: number }[];
}

function getColorUS(count: number, max: number): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (ratio > 0.5) return "#1e40af";
  if (ratio > 0.3) return "#2563eb";
  if (ratio > 0.15) return "#3b82f6";
  if (ratio > 0.05) return "#60a5fa";
  if (ratio > 0.02) return "#93c5fd";
  return "#bfdbfe";
}

function getColorCA(count: number, max: number): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (ratio > 0.5) return "#065f46";
  if (ratio > 0.3) return "#047857";
  if (ratio > 0.15) return "#059669";
  if (ratio > 0.05) return "#34d399";
  if (ratio > 0.02) return "#6ee7b7";
  return "#a7f3d0";
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers/stats"],
  });

  const [hoveredUS, setHoveredUS] = useState<{ abbr: string; cnt: number } | null>(null);
  const [hoveredCA, setHoveredCA] = useState<{ abbr: string; cnt: number } | null>(null);

  const stateMap = useMemo(() => {
    const map: Record<string, number> = {};
    stats?.byState.forEach((s) => { map[s.state] = s.cnt; });
    return map;
  }, [stats]);

  const provinceMap = useMemo(() => {
    const map: Record<string, number> = {};
    stats?.byProvince?.forEach((p) => { map[p.province] = p.cnt; });
    return map;
  }, [stats]);

  const maxState = useMemo(() => {
    return stats?.byState.length ? Math.max(...stats.byState.map((s) => s.cnt)) : 1;
  }, [stats]);

  const maxProv = useMemo(() => {
    return stats?.byProvince?.length ? Math.max(...stats.byProvince.map((p) => p.cnt)) : 1;
  }, [stats]);

  const usCount = stats?.byCountry.find((c) => c.country === "US")?.cnt ?? 0;
  const caCount = stats?.byCountry.find((c) => c.country === "CA")?.cnt ?? 0;

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-dashboard">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500/15">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your customer data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-us-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">United States</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hoveredUS && (
                <Badge variant="secondary" data-testid="badge-hovered-us">
                  {hoveredUS.abbr}: {hoveredUS.cnt.toLocaleString()}
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-us-count">
                {usCount.toLocaleString()} customers
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[220px]" />
            ) : (
              <div>
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 700 }}
                  width={700}
                  height={380}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-us"
                >
                  <Geographies geography={US_TOPO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const fips = geo.id;
                        const abbr = STATE_FIPS_TO_ABBR[fips] ?? "";
                        const count = stateMap[abbr] ?? 0;
                        const fill = getColorUS(count, maxState);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredUS?.abbr === abbr ? "#1d4ed8" : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => setHoveredUS({ abbr, cnt: count })}
                            onMouseLeave={() => setHoveredUS(null)}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <div className="flex items-center gap-2 justify-center mt-1" data-testid="legend-us">
                  <span className="text-[10px] text-muted-foreground">0</span>
                  <div className="flex h-1.5 rounded-full overflow-hidden">
                    {["#f1f5f9", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1e40af"].map((c) => (
                      <div key={c} className="w-5 h-1.5" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{maxState.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-ca-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Canada</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hoveredCA && (
                <Badge variant="secondary" data-testid="badge-hovered-ca">
                  {hoveredCA.abbr}: {hoveredCA.cnt.toLocaleString()}
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-ca-count">
                {caCount.toLocaleString()} customers
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[220px]" />
            ) : (
              <div>
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ scale: 280, center: [-96, 62] }}
                  width={700}
                  height={380}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-ca"
                >
                  <Geographies geography={CA_GEO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const name = geo.properties?.name ?? "";
                        const abbr = PROVINCE_NAME_TO_ABBR[name] ?? name;
                        const count = provinceMap[abbr] ?? 0;
                        const fill = getColorCA(count, maxProv);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredCA?.abbr === abbr ? "#047857" : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => setHoveredCA({ abbr, cnt: count })}
                            onMouseLeave={() => setHoveredCA(null)}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <div className="flex items-center gap-2 justify-center mt-1" data-testid="legend-ca">
                  <span className="text-[10px] text-muted-foreground">0</span>
                  <div className="flex h-1.5 rounded-full overflow-hidden">
                    {["#f1f5f9", "#a7f3d0", "#6ee7b7", "#34d399", "#059669", "#047857", "#065f46"].map((c) => (
                      <div key={c} className="w-5 h-1.5" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{maxProv.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
