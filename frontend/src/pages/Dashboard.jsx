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
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get("/dashboard/", {
                params: {
                    month: selectedMonth,
                    year: selectedYear
                }
            });
            const data = response.data;

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
            setAlerts(data.alerts || []);

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
                const currentMonthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("es-SV", {
                    month: "short",
                });
                // Fix prev month name calculation for UI
                const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
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
        () => [
            {
                title: "Órdenes Activas",
                value: stats.activeOrders,
                icon: Truck,
                variant: "primary",
            },
            {
                title: "Ingresos del Mes",
                value: formatCurrency(stats.monthlyRevenue),
                icon: DollarSign,
                variant: "success",
            },
            {
                title: "OS del Mes",
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
                title: "Rentabilidad",
                value: formatCurrency(stats.profitability),
                trend:
                    stats.profitabilityTrend > 0
                        ? "up"
                        : stats.profitabilityTrend < 0
                        ? "down"
                        : "neutral",
                trendValue: `${Math.abs(stats.profitabilityTrend)}%`,
                icon: TrendingUp,
                variant: "success",
            },
            {
                title: "Facturas Pendientes",
                value: stats.pendingInvoices,
                icon: AlertCircle,
                variant: "warning",
            },
        ],
        [stats]
    );

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
                                { id: 0, name: "Año" },
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
                        />
                        <SelectERP
                            value={selectedYear}
                            onChange={(val) => setSelectedYear(val)}
                            options={Array.from({ length: 5 }, (_, i) => ({
                                id: new Date().getFullYear() - 2 + i,
                                name: String(new Date().getFullYear() - 2 + i)
                            }))}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            className="w-20 sm:w-24"
                            size="sm"
                            isClearable={false}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboardData}
                        className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 h-9 px-2.5 sm:px-3"
                    >
                        <RefreshCw className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Actualizar</span>
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-warning-50 border border-warning-200 rounded-md p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5 flex-shrink-0" />
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

            {/* Charts Row - Stack en móvil */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-6">
                {/* Main Chart - Revenue vs Expenses */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Ingresos vs Gastos</CardTitle>
                        <CardDescription>Comparativa mensual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Altura responsive para gráficos */}
                        <div className="h-[200px] sm:h-[260px] lg:h-[320px] w-full">
                            {chartData.revenueVsExpenses.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <BarChart3 className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">
                                        Sin datos de facturación
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Los datos aparecerán cuando haya
                                        operaciones
                                    </p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData.revenueVsExpenses}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#e2e8f0"
                                        />
                                        <XAxis
                                            dataKey="name"
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
                                            tickFormatter={(value) =>
                                                `$${(value / 1000).toFixed(0)}k`
                                            }
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "6px",
                                                border: "1px solid #e2e8f0",
                                                boxShadow:
                                                    "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                fontSize: "13px",
                                            }}
                                            formatter={(value) =>
                                                formatCurrency(value)
                                            }
                                        />
                                        <Legend
                                            wrapperStyle={{
                                                paddingTop: "16px",
                                                fontSize: "13px",
                                            }}
                                            iconType="line"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="ingresos"
                                            stroke="#16a34a"
                                            strokeWidth={2.5}
                                            dot={{
                                                fill: "#16a34a",
                                                r: 3,
                                                strokeWidth: 2,
                                                stroke: "#fff",
                                            }}
                                            activeDot={{ r: 5 }}
                                            name="Ingresos"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="gastos"
                                            stroke="#dc2626"
                                            strokeWidth={2.5}
                                            dot={{
                                                fill: "#dc2626",
                                                r: 3,
                                                strokeWidth: 2,
                                                stroke: "#fff",
                                            }}
                                            activeDot={{ r: 5 }}
                                            name="Gastos"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Secondary Chart - Orders Trend */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Volumen de Órdenes</CardTitle>
                        <CardDescription>Comparativa mensual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Altura responsive para gráficos */}
                        <div className="h-[200px] sm:h-[260px] lg:h-[320px] w-full">
                            {chartData.monthlyOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <FileText className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">
                                        Sin órdenes registradas
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Cree su primera orden de servicio
                                    </p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.monthlyOrders}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#e2e8f0"
                                        />
                                        <XAxis
                                            dataKey="name"
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
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#f1f5f9" }}
                                            contentStyle={{
                                                borderRadius: "6px",
                                                border: "1px solid #e2e8f0",
                                                boxShadow:
                                                    "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                fontSize: "13px",
                                            }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="#334155"
                                            radius={[4, 4, 0, 0]}
                                            name="Órdenes"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row - Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clients Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Top 5 Clientes</CardTitle>
                                <CardDescription>
                                    Mayor facturación
                                </CardDescription>
                            </div>
                            <BarChart3 className="h-4 w-4 text-slate-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {topClients.length === 0 ? (
                                <div className="py-8 text-center text-slate-500">
                                    No hay datos de clientes
                                </div>
                            ) : (
                                topClients.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {client.client_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {client.orders_count}{" "}
                                                    órdenes
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                                {formatCurrency(
                                                    client.total_revenue || 0
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts Panel */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Alertas y Pendientes</CardTitle>
                                <CardDescription>
                                    Requieren atención
                                </CardDescription>
                            </div>
                            <AlertTriangle className="h-4 w-4 text-slate-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {alerts.length === 0 ? (
                                <div className="py-8 text-center text-slate-500">
                                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-success-500" />
                                    <p className="text-sm">
                                        ¡Todo en orden! No hay alertas
                                        pendientes.
                                    </p>
                                </div>
                            ) : (
                                alerts.map((alert) => {
                                    const severityConfig = {
                                        high: {
                                            bg: "bg-danger-50",
                                            border: "border-danger-200",
                                            icon: XCircle,
                                            iconColor: "text-danger-600",
                                        },
                                        warning: {
                                            bg: "bg-warning-50",
                                            border: "border-warning-200",
                                            icon: AlertTriangle,
                                            iconColor: "text-warning-600",
                                        },
                                        medium: {
                                            bg: "bg-warning-50",
                                            border: "border-warning-200",
                                            icon: Clock,
                                            iconColor: "text-warning-600",
                                        },
                                    };
                                    const config =
                                        severityConfig[alert.severity] ||
                                        severityConfig.medium;
                                    const AlertIcon = config.icon;

                                    const shouldShowSubtext = 
                                        (alert.client && !alert.message.includes(alert.client)) || 
                                        (alert.order && !alert.message.includes(alert.order));

                                    return (
                                        <div
                                            key={alert.id}
                                            className={cn(
                                                "p-3 rounded border",
                                                config.bg,
                                                config.border
                                            )}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <AlertIcon
                                                    className={cn(
                                                        "h-4 w-4 mt-0.5 flex-shrink-0",
                                                        config.iconColor
                                                    )}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {alert.message}
                                                    </p>
                                                    {shouldShowSubtext && (
                                                        <p className="text-xs text-slate-600 mt-0.5">
                                                            {alert.client
                                                                ? `Cliente: ${alert.client}`
                                                                : `Orden: ${alert.order}`}
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

            {/* Recent Orders Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Órdenes Recientes</CardTitle>
                            <CardDescription>
                                Últimos movimientos registrados
                            </CardDescription>
                        </div>
                        <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Orden
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Cliente
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Fecha
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Monto
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-3 py-8 text-center text-slate-500"
                                        >
                                            No hay órdenes recientes
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.slice(0, 8).map((order) => (
                                        <tr
                                            key={order.id}
                                            onClick={() =>
                                                navigate(
                                                    `/service-orders/${order.id}`
                                                )
                                            }
                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-2.5 font-mono text-sm font-medium text-slate-900">
                                                {order.order_number}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700">
                                                {order.client_name}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">
                                                {order.created_at
                                                    ? new Date(
                                                          order.created_at
                                                      ).toLocaleDateString(
                                                          "es-SV"
                                                      )
                                                    : "-"}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-medium text-slate-900 tabular-nums">
                                                {formatCurrency(
                                                    order.total_amount || 0
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <StatusBadge
                                                    status={order.status}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default Dashboard;
