import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Truck,
    DollarSign,
    FileText,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    XCircle,
    AlertTriangle,
    Clock,
    RefreshCw,
    BarChart3,
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    StatCard,
} from "../components/ui/Card";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { 
    Button,
    SelectERP,
} from "../components/ui";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";
import api from "../lib/axios";
import { cn, formatCurrency } from "../lib/utils";

/**
 * Dashboard - Panel de Control Ejecutivo
 * Design System Corporativo GPRO
 * Muestra solo datos reales del sistema
 */

function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Initialize from localStorage or default to "All Time" (Year 0)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const saved = localStorage.getItem("dashboard_month");
        return saved ? parseInt(saved) : 0; // Default to 0 (All Year)
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem("dashboard_year");
        return saved ? parseInt(saved) : 0; // Default to 0 (All Time)
    });

    // Persist selection
    useEffect(() => {
        localStorage.setItem("dashboard_month", selectedMonth);
        localStorage.setItem("dashboard_year", selectedYear);
    }, [selectedMonth, selectedYear]);

    const [stats, setStats] = useState({
        totalClients: 0,
        activeOrders: 0,
        monthlyRevenue: 0,
        pendingInvoices: 0,
        ordersThisMonth: 0,
        ordersThisMonthTrend: 0,
        profitability: 0,
        profitabilityTrend: 0,
        averageOrderValue: 0,
        completionRate: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [topClients, setTopClients] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [chartData, setChartData] = useState({
        monthlyOrders: [],
        revenueVsExpenses: [],
        statusDistribution: [],
    });
    const [clientBreakdown, setClientBreakdown] = useState([]);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [revenueComposition, setRevenueComposition] = useState(null);
    const [profitabilityData, setProfitabilityData] = useState({ margen: 0, rentabilidad_porcentaje: 0 });

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [response, alertsResponse] = await Promise.all([
                api.get("/dashboard/", {
                    params: {
                        month: selectedMonth,
                        year: selectedYear
                    }
                }),
                api.get("/dashboard/alerts/")
            ]);
            
            const data = response.data;
            const alertsData = alertsResponse.data; // Now returns a flat list

            // Establecer estadísticas reales - sin fallbacks ficticios
            setStats({
                totalClients: data.overall?.total_clients || 0,
                activeOrders: data.overall?.os_abiertas || 0,
                monthlyRevenue: data.current_month?.billed_amount || 0,
                pendingInvoices: data.overall?.pending_invoices || 0,
                ordersThisMonth: data.current_month?.total_os_month || 0,
                ordersThisMonthTrend: data.trends?.os_trend || 0,
                profitability: data.current_month?.billed_amount
                    ? data.current_month.billed_amount -
                      data.current_month.operating_costs -
                      data.current_month.admin_costs
                    : 0,
                profitabilityTrend: data.trends?.billing_trend || 0,
                averageOrderValue:
                    data.current_month?.total_os_month > 0
                        ? data.current_month.billed_amount /
                          data.current_month.total_os_month
                        : 0,
                completionRate:
                    data.overall?.os_abiertas + data.overall?.os_cerradas > 0
                        ? Math.round(
                              (data.overall.os_cerradas /
                                  (data.overall.os_abiertas +
                                      data.overall.os_cerradas)) *
                                  100
                          )
                        : 0,
            });

            // Órdenes recientes
            setRecentOrders(data.recent_orders || []);

            // Top clientes - datos reales, mapeando correctamente los campos
            const mappedTopClients = (data.top_clients || []).map((client) => ({
                id: client.id,
                client_name: client.name,
                total_revenue: client.total_amount || 0,
                orders_count: client.total_orders || 0,
            }));
            setTopClients(mappedTopClients);

            // Alertas reales del sistema
            setAlerts(alertsData || []);

            // Client breakdown data for comparative table
            setClientBreakdown(data.client_breakdown || []);

            // New data for advanced charts
            setCashFlowData(data.cash_flow_data || []);
            setRevenueComposition(data.revenue_composition || null);
            setProfitabilityData(data.profitability || { margen: 0, rentabilidad_porcentaje: 0 });

            // Construir chartData solo con datos reales disponibles
            const chartDataPoints = [];

            if (data.monthly_breakdown && data.monthly_breakdown.length > 0) {
                // Annual View: Use full breakdown
                data.monthly_breakdown.forEach(m => {
                    chartDataPoints.push({
                        name: m.name,
                        ingresos: m.ingresos,
                        gastos: m.gastos,
                        value: m.total_os
                    });
                });
            } else {
                // Monthly View: Current vs Previous
                // Generar datos de gráficos solo con el mes actual si hay datos
                // No inventamos historial que no existe
                const currentMonthName = new Date(selectedYear || new Date().getFullYear(), selectedMonth - 1, 1).toLocaleDateString("es-SV", {
                    month: "short",
                });
                // Fix prev month name calculation for UI
                const prevDate = new Date(selectedYear || new Date().getFullYear(), selectedMonth - 1, 1);
                prevDate.setMonth(prevDate.getMonth() - 1);
                const prevMonthName = prevDate.toLocaleDateString("es-SV", { month: "short" });

                // Si hay datos del mes anterior, incluirlos
                if (
                    data.previous_month?.billed_amount > 0 ||
                    data.previous_month?.operating_costs > 0
                ) {
                    chartDataPoints.push({
                        name: prevMonthName,
                        ingresos: data.previous_month.billed_amount || 0,
                        gastos: data.previous_month.operating_costs || 0,
                        value: data.previous_month.total_os || 0,
                    });
                }

                // Siempre incluir el mes actual
                chartDataPoints.push({
                    name: currentMonthName,
                    ingresos: data.current_month?.billed_amount || 0,
                    gastos:
                        (data.current_month?.operating_costs || 0) +
                        (data.current_month?.admin_costs || 0),
                    value: data.current_month?.total_os_month || 0,
                });
            }

            setChartData({
                monthlyOrders: chartDataPoints.map((d) => ({
                    name: d.name,
                    value: d.value,
                })),
                revenueVsExpenses: chartDataPoints.map((d) => ({
                    name: d.name,
                    ingresos: d.ingresos,
                    gastos: d.gastos,
                })),
                statusDistribution: [
                    {
                        name: "Pendiente",
                        value: data.overall?.os_pendiente || 0,
                        color: "#94a3b8",
                    },
                    {
                        name: "En Tránsito",
                        value: data.overall?.os_en_transito || 0,
                        color: "#6366f1",
                    },
                    {
                        name: "En Puerto",
                        value: data.overall?.os_en_puerto || 0,
                        color: "#0ea5e9",
                    },
                    {
                        name: "En Almacenadora",
                        value: data.overall?.os_en_almacen || 0,
                        color: "#f59e0b",
                    },
                    {
                        name: "Finalizada",
                        value: data.overall?.os_finalizada || 0,
                        color: "#10b981",
                    },
                    {
                        name: "Cerrada",
                        value: data.overall?.os_cerradas || 0,
                        color: "#1e293b",
                    },
                ].filter((i) => i.value > 0),
            });
        } catch {
            setError(
                "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo."
            );

            // En caso de error, mostrar estados vacíos en lugar de datos ficticios
            setStats({
                totalClients: 0,
                activeOrders: 0,
                monthlyRevenue: 0,
                pendingInvoices: 0,
                ordersThisMonth: 0,
                ordersThisMonthTrend: 0,
                profitability: 0,
                profitabilityTrend: 0,
                averageOrderValue: 0,
                completionRate: 0,
            });
            setRecentOrders([]);
            setTopClients([]);
            setAlerts([]);
            setClientBreakdown([]);
            setCashFlowData([]);
            setRevenueComposition(null);
            setProfitabilityData({ margen: 0, rentabilidad_porcentaje: 0 });
            setChartData({
                monthlyOrders: [],
                revenueVsExpenses: [],
                statusDistribution: [],
            });
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // KPI Cards data
    const kpiCards = useMemo(
        () => {
            const monthName = selectedMonth > 0 
                ? new Date(selectedYear || new Date().getFullYear(), selectedMonth - 1).toLocaleString('es-SV', { month: 'long' }) 
                : '';
            
            const billingTitle = selectedYear === 0 
                ? "Facturación Histórica Total" 
                : (selectedMonth === 0 ? `Facturación Anual ${selectedYear}` : `Facturación de ${monthName}`);
            
            const ordersTitle = selectedYear === 0 
                ? "OS Totales Históricas" 
                : (selectedMonth === 0 ? `OS Totales ${selectedYear}` : `OS de ${monthName}`);

            return [
                {
                    title: "Órdenes Activas",
                    value: stats.activeOrders,
                    icon: Truck,
                    variant: "primary",
                },
                {
                    title: billingTitle,
                    value: formatCurrency(stats.monthlyRevenue),
                    icon: DollarSign,
                    variant: "success",
                },
                {
                    title: ordersTitle,
                    value: stats.ordersThisMonth,
                    trend:
                        stats.ordersThisMonthTrend > 0
                            ? "up"
                            : stats.ordersThisMonthTrend < 0
                            ? "down"
                            : "neutral",
                    trendValue: `${Math.abs(stats.ordersThisMonthTrend)}%`,
                    icon: FileText,
                    variant: "info",
                },
                {
                    title: "Margen Bruto",
                    value: formatCurrency(profitabilityData.margen),
                    icon: TrendingUp,
                    variant: profitabilityData.margen >= 0 ? "success" : "danger",
                },
                {
                    title: "Rentabilidad",
                    value: `${profitabilityData.rentabilidad_porcentaje.toFixed(1)}%`,
                    icon: BarChart3,
                    variant: profitabilityData.rentabilidad_porcentaje >= 20 ? "success" : profitabilityData.rentabilidad_porcentaje >= 10 ? "warning" : "danger",
                },
            ];
        },
        [stats, profitabilityData, selectedYear, selectedMonth]
    );

    // Prepare data for Revenue Composition Donut Chart
    const revenuePieData = useMemo(() => {
        if (!revenueComposition) return [];
        return [
            { name: 'Propios', value: revenueComposition.servicios_propios, color: '#10b981' }, // emerald-500
            { name: 'Tercerizados', value: revenueComposition.servicios_tercerizados, color: '#3b82f6' }, // blue-500
            { name: 'Gastos', value: revenueComposition.gastos_terceros, color: '#f59e0b' } // amber-500
        ].filter(item => item.value > 0);
    }, [revenueComposition]);

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>

                {/* KPI Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    <Skeleton className="h-[400px] lg:col-span-4 rounded-xl" />
                    <Skeleton className="h-[400px] lg:col-span-3 rounded-xl" />
                </div>

                {/* Bottom Tables Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[300px] rounded-xl" />
                    <Skeleton className="h-[300px] rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - Responsive */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">Panel de Control</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Resumen operativo y financiero</p>
                </div>
                {/* Filtros - Stack en móvil, inline en desktop */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <SelectERP
                            value={selectedMonth}
                            onChange={(val) => setSelectedMonth(val)}
                            options={[
                                { id: 0, name: "Todo el año" },
                                { id: 1, name: "Ene" }, { id: 2, name: "Feb" },
                                { id: 3, name: "Mar" }, { id: 4, name: "Abr" },
                                { id: 5, name: "May" }, { id: 6, name: "Jun" },
                                { id: 7, name: "Jul" }, { id: 8, name: "Ago" },
                                { id: 9, name: "Sep" }, { id: 10, name: "Oct" },
                                { id: 11, name: "Nov" }, { id: 12, name: "Dic" },
                            ]}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            className="w-20 sm:w-28"
                            size="sm"
                            isClearable={false}
                            disabled={selectedYear === 0}
                        />
                        <SelectERP
                            value={selectedYear}
                            onChange={(val) => {
                                setSelectedYear(val);
                                if (val === 0) setSelectedMonth(0);
                            }}
                            options={[
                                { id: 0, name: "Todo el tiempo" },
                                ...Array.from({ length: 4 }, (_, i) => ({
                                    id: new Date().getFullYear() - i,
                                    name: String(new Date().getFullYear() - i)
                                }))
                            ]}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            className="w-32 sm:w-36"
                            size="sm"
                            isClearable={false}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboardData}
                        className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 h-9 px-2.5 sm:px-3 flex items-center justify-center"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Actualizar</span>
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-warning-50 border border-warning-200 rounded-md p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-warning-600 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-warning-800">
                            Aviso del Sistema
                        </h3>
                        <p className="text-sm text-warning-700 mt-1">
                            {error}{" "}
                            <button
                                onClick={fetchDashboardData}
                                className="underline hover:text-warning-900 font-medium"
                            >
                                Reintentar conexión
                            </button>
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Grid - Responsive: 2 cols en móvil, 3 en tablet, 5 en desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                {kpiCards.map((kpi, index) => (
                    <StatCard
                        key={index}
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        trend={kpi.trend}
                        trendValue={kpi.trendValue}
                        description={kpi.trend ? "vs mes anterior" : undefined}
                        compact={true}
                    />
                ))}
            </div>

            {/* Main Content Row - Tabla + Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-6">
                {/* Main Table - Client Financial Breakdown */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Análisis de Saldos Pendientes por Cliente</CardTitle>
                        <CardDescription>Desglose de cuentas por cobrar</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                            {clientBreakdown.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                    <BarChart3 className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">
                                        Sin saldos pendientes
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Todo está al día
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-sm border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                        <tr className="border-b-2 border-slate-300">
                                            <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Saldo Pendiente
                                            </th>
                                            <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Servicios (Pend)
                                            </th>
                                            <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Préstamos (Pend)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {clientBreakdown.map((client, index) => {
                                            return (
                                                <tr
                                                    key={client.client_id || index}
                                                    className="hover:bg-slate-50/50 transition-colors group"
                                                >
                                                    <td className="px-4 py-3.5 text-slate-900 font-medium">
                                                        {client.client_name}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                                                        <span className="text-emerald-700">
                                                            {formatCurrency(client.total_ingresos || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                                                        {formatCurrency(client.total_servicios || 0)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                                                        {formatCurrency(client.total_prestamos || 0)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.1)]">
                                        <tr>
                                            <td className="px-4 py-4 text-slate-900 uppercase text-xs tracking-wide">
                                                Total General
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-900 tabular-nums">
                                                <span className="text-emerald-700">
                                                    {formatCurrency(
                                                        clientBreakdown.reduce((sum, c) => sum + (c.total_ingresos || 0), 0)
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-900 tabular-nums">
                                                {formatCurrency(
                                                    clientBreakdown.reduce((sum, c) => sum + (c.total_servicios || 0), 0)
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-900 tabular-nums">
                                                {formatCurrency(
                                                    clientBreakdown.reduce((sum, c) => sum + (c.total_prestamos || 0), 0)
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alertas Sidebar - Diseño ERP Profesional */}
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Alertas</CardTitle>
                                <CardDescription className="text-xs">Requieren atención</CardDescription>
                            </div>
                            <Badge variant={alerts.length > 0 ? "danger" : "success"} className="text-xs px-2 py-0.5">
                                {alerts.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {alerts.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                                    <CheckCircle className="h-10 w-10 mb-2 text-emerald-400" />
                                    <p className="text-sm font-medium text-slate-600">Todo en orden</p>
                                    <p className="text-xs text-slate-400 mt-1">No hay alertas pendientes</p>
                                </div>
                            ) : (
                                alerts.map((alert) => {
                                    const isHigh = alert.severity === 'high';
                                    const isMedium = alert.severity === 'medium';
                                    
                                    return (
                                        <div
                                            key={alert.id}
                                            className={cn(
                                                "p-3 rounded-lg border-l-3 transition-all",
                                                isHigh && "bg-red-50 border-l-red-500 hover:bg-red-100/70",
                                                isMedium && "bg-amber-50 border-l-amber-500 hover:bg-amber-100/70",
                                                !isHigh && !isMedium && "bg-blue-50 border-l-blue-500 hover:bg-blue-100/70"
                                            )}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                {isHigh ? (
                                                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                ) : isMedium ? (
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-900 leading-tight">
                                                        {alert.message}
                                                    </p>
                                                    {alert.client && (
                                                        <p className="text-xs text-slate-600 mt-1 truncate">
                                                            <span className="font-medium">Cliente:</span> {alert.client}
                                                        </p>
                                                    )}
                                                    {alert.amount && (
                                                        <p className="text-xs font-semibold text-slate-900 mt-1.5">
                                                            {formatCurrency(alert.amount)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row - Flujo de Caja + Composición de Ingresos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Cash Flow Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            {selectedYear === 0 
                                ? "Flujo de Caja Histórico" 
                                : (selectedMonth === 0 ? "Flujo de Caja Anual" : "Flujo de Caja Mensual")}
                        </CardTitle>
                        <CardDescription>Facturación Emitida vs Cobros vs Saldos Pendientes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            {cashFlowData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <DollarSign className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">Sin datos de flujo de caja</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cashFlowData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#f1f5f9" }}
                                            contentStyle={{
                                                borderRadius: "8px",
                                                border: "1px solid #e2e8f0",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                fontSize: "13px",
                                            }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                                            iconType="circle"
                                        />
                                        <Bar dataKey="facturado" fill="#10b981" radius={[4, 4, 0, 0]} name="Facturado (Emitido)" barSize={40} />
                                        <Bar dataKey="cobrado" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cobrado (Pagos)" barSize={40} />
                                        <Bar dataKey="pendiente" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pendiente (Saldo)" barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Composition Chart */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {selectedYear === 0 
                                ? "Composición Histórica" 
                                : (selectedMonth === 0 ? "Composición Anual" : "Composición Mensual")}
                        </CardTitle>
                        <CardDescription className="text-xs">Desglose de Facturación</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!revenueComposition || revenueComposition.total === 0 ? (
                            <div className="h-[240px] flex flex-col items-center justify-center text-slate-400">
                                <BarChart3 className="h-10 w-10 mb-2 text-slate-300" />
                                <p className="text-sm font-medium">Sin datos</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    {/* Servicios Propios */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-medium text-slate-700">Servicios Propios</span>
                                            <span className="text-xs font-bold text-emerald-700">
                                                {revenueComposition.porcentaje_propios}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-600"
                                                style={{ width: `${revenueComposition.porcentaje_propios}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 font-semibold">
                                            {formatCurrency(revenueComposition.servicios_propios)}
                                        </p>
                                    </div>
                                    
                                    {/* Servicios Tercerizados */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-medium text-slate-700">Servicios Tercerizados</span>
                                            <span className="text-xs font-bold text-blue-700">
                                                {revenueComposition.porcentaje_tercerizados}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600"
                                                style={{ width: `${revenueComposition.porcentaje_tercerizados}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 font-semibold">
                                            {formatCurrency(revenueComposition.servicios_tercerizados)}
                                        </p>
                                    </div>

                                    {/* Gastos a Terceros (Nuevo) */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-medium text-slate-700">Gastos a Terceros</span>
                                            <span className="text-xs font-bold text-amber-700">
                                                {revenueComposition.porcentaje_gastos}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500"
                                                style={{ width: `${revenueComposition.porcentaje_gastos}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 font-semibold">
                                            {formatCurrency(revenueComposition.gastos_terceros)}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-900">Total Facturado</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {formatCurrency(revenueComposition.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders - Full Width */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Órdenes Recientes</CardTitle>
                            <CardDescription className="text-xs">
                                Últimos 8 movimientos registrados
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/service-orders')}
                            className="text-xs h-7 px-2 hover:bg-slate-100"
                        >
                            Ver todas
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {recentOrders.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <FileText className="h-12 w-12 mb-3 text-slate-300" />
                            <p className="text-sm font-medium text-slate-600">No hay órdenes recientes</p>
                            <p className="text-xs text-slate-400 mt-1">Las nuevas órdenes aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Orden
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Cliente
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide hidden sm:table-cell">
                                            Fecha
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Monto
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentOrders.slice(0, 8).map((order) => (
                                        <tr
                                            key={order.id}
                                            onClick={() => navigate(`/service-orders/${order.id}`)}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-900">
                                                {order.order_number}
                                            </td>
                                            <td className="px-3 py-2.5 text-sm text-slate-700 font-medium truncate max-w-[250px]">
                                                {order.client_name}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-500 hidden sm:table-cell">
                                                {order.created_at
                                                    ? new Date(order.created_at).toLocaleDateString("es-SV", {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })
                                                    : "-"}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                                                {formatCurrency(order.total_amount || 0)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <StatusBadge status={order.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        );
    }

    export default Dashboard;
