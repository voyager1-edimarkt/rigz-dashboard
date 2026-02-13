import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, LayoutDashboard } from "lucide-react";
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

type MapView = "US" | "CA";

function getColorForCount(count: number, max: number, palette: "blue" | "emerald"): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (palette === "blue") {
    if (ratio > 0.5) return "#1e40af";
    if (ratio > 0.3) return "#2563eb";
    if (ratio > 0.15) return "#3b82f6";
    if (ratio > 0.05) return "#60a5fa";
    if (ratio > 0.02) return "#93c5fd";
    return "#bfdbfe";
  }
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

  const [mapView, setMapView] = useState<MapView>("US");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredCount, setHoveredCount] = useState<number>(0);

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

  const maxStateCount = useMemo(() => {
    return stats?.byState.length ? Math.max(...stats.byState.map((s) => s.cnt)) : 1;
  }, [stats]);

  const maxProvinceCount = useMemo(() => {
    return stats?.byProvince?.length ? Math.max(...stats.byProvince.map((p) => p.cnt)) : 1;
  }, [stats]);

  const usCount = stats?.byCountry.find((c) => c.country === "US")?.cnt ?? 0;
  const caCount = stats?.byCountry.find((c) => c.country === "CA")?.cnt ?? 0;

  const currentRegionData = mapView === "US" ? stats?.byState ?? [] : (stats?.byProvince ?? []).map(p => ({ state: p.province, cnt: p.cnt }));
  const currentMax = mapView === "US" ? maxStateCount : maxProvinceCount;
  const palette = mapView === "US" ? "blue" : "emerald";
  const hoverColor = mapView === "US" ? "#1d4ed8" : "#047857";
  const legendColors = mapView === "US"
    ? ["#f1f5f9", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1e40af"]
    : ["#f1f5f9", "#a7f3d0", "#6ee7b7", "#34d399", "#059669", "#047857", "#065f46"];

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="card-customer-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Customer Distribution</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hoveredRegion && (
                <Badge variant="secondary" data-testid="badge-hovered-region">
                  {hoveredRegion}: {hoveredCount.toLocaleString()}
                </Badge>
              )}
              <div className="flex rounded-md border overflow-visible" data-testid="map-view-toggle">
                <Button
                  size="sm"
                  variant={mapView === "US" ? "default" : "ghost"}
                  className={`rounded-none rounded-l-md text-xs px-3 toggle-elevate ${mapView === "US" ? "toggle-elevated" : ""}`}
                  onClick={() => setMapView("US")}
                  data-testid="button-map-us"
                >
                  US
                </Button>
                <Button
                  size="sm"
                  variant={mapView === "CA" ? "default" : "ghost"}
                  className={`rounded-none rounded-r-md text-xs px-3 toggle-elevate ${mapView === "CA" ? "toggle-elevated" : ""}`}
                  onClick={() => setMapView("CA")}
                  data-testid="button-map-ca"
                >
                  Canada
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[340px]" />
            ) : mapView === "US" ? (
              <div className="relative">
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 900 }}
                  width={800}
                  height={450}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-us"
                >
                  <Geographies geography={US_TOPO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const fips = geo.id;
                        const abbr = STATE_FIPS_TO_ABBR[fips] ?? "";
                        const count = stateMap[abbr] ?? 0;
                        const fill = getColorForCount(count, maxStateCount, "blue");
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredRegion === abbr ? hoverColor : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => { setHoveredRegion(abbr); setHoveredCount(count); }}
                            onMouseLeave={() => { setHoveredRegion(null); setHoveredCount(0); }}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                            data-testid={`map-state-${abbr}`}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
            ) : (
              <div className="relative">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ scale: 350, center: [-96, 62] }}
                  width={800}
                  height={450}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-ca"
                >
                  <Geographies geography={CA_GEO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const name = geo.properties?.name ?? "";
                        const abbr = PROVINCE_NAME_TO_ABBR[name] ?? name;
                        const count = provinceMap[abbr] ?? 0;
                        const fill = getColorForCount(count, maxProvinceCount, "emerald");
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredRegion === abbr ? hoverColor : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => { setHoveredRegion(abbr); setHoveredCount(count); }}
                            onMouseLeave={() => { setHoveredRegion(null); setHoveredCount(0); }}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                            data-testid={`map-province-${abbr}`}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
            )}
            <div className="flex items-center gap-2 justify-center mt-2" data-testid="map-legend">
              <span className="text-xs text-muted-foreground">0</span>
              <div className="flex h-2 rounded-full overflow-hidden">
                {legendColors.map((c) => (
                  <div key={c} className="w-6 h-2" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{currentMax.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card data-testid="card-countries">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Countries</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    className={`flex items-center gap-3 p-3 rounded-md w-full text-left transition-colors ${mapView === "US" ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/30 border border-transparent hover-elevate"}`}
                    onClick={() => setMapView("US")}
                    data-testid="stat-country-US"
                  >
                    <span className="text-2xl leading-none">&#x1F1FA;&#x1F1F8;</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">United States</p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.total ? ((usCount / stats.total) * 100).toFixed(1) : 0}% of customers
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{usCount.toLocaleString()}</span>
                  </button>
                  <button
                    className={`flex items-center gap-3 p-3 rounded-md w-full text-left transition-colors ${mapView === "CA" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-muted/30 border border-transparent hover-elevate"}`}
                    onClick={() => setMapView("CA")}
                    data-testid="stat-country-CA"
                  >
                    <span className="text-2xl leading-none">&#x1F1E8;&#x1F1E6;</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Canada</p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.total ? ((caCount / stats.total) * 100).toFixed(1) : 0}% of customers
                      </p>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{caCount.toLocaleString()}</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-top-regions">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">{mapView === "US" ? "Top States" : "Top Provinces"}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : currentRegionData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No regional data available</p>
              ) : (
                <div className="space-y-2">
                  {currentRegionData.slice(0, 8).map((s) => {
                    const pct = currentMax > 0 ? (s.cnt / currentMax) * 100 : 0;
                    const barColor = mapView === "US" ? "bg-blue-500" : "bg-emerald-500";
                    const highlightColor = mapView === "US" ? "text-blue-600" : "text-emerald-600";
                    return (
                      <div
                        key={s.state}
                        className="flex items-center gap-2"
                        data-testid={`stat-region-${s.state}`}
                        onMouseEnter={() => { setHoveredRegion(s.state); setHoveredCount(s.cnt); }}
                        onMouseLeave={() => { setHoveredRegion(null); setHoveredCount(0); }}
                      >
                        <span className={`text-xs w-8 font-mono ${hoveredRegion === s.state ? `${highlightColor} font-semibold` : "text-muted-foreground"}`}>{s.state}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{s.cnt.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
