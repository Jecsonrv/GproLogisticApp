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
import { Button } from "../components/ui/Button";
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

            const response = await api.get("/dashboard/");
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

            // Generar datos de gráficos solo con el mes actual si hay datos
            // No inventamos historial que no existe
            const currentMonthName = new Date().toLocaleDateString("es-SV", {
                month: "short",
            });
            const prevMonthName = new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
            ).toLocaleDateString("es-SV", { month: "short" });

            // Construir chartData solo con datos reales disponibles
            const chartDataPoints = [];

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
                        name: "Abiertas",
                        value: data.overall?.os_abiertas || 0,
                        color: "#0052cc",
                    },
                    {
                        name: "Cerradas",
                        value: data.overall?.os_cerradas || 0,
                        color: "#16a34a",
                    },
                ].filter((i) => i.value > 0),
            });
        } catch {
            setError(
                "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
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
    }, []);

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
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>

                {/* KPI Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[320px] w-full" />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[320px] w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-end gap-2">
                {error && (
                    <Badge variant="warning" className="gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Modo Offline
                    </Badge>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDashboardData}
                    className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Actualizar
                </Button>
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

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiCards.map((kpi, index) => (
                    <StatCard
                        key={index}
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        trend={kpi.trend}
                        trendValue={kpi.trendValue}
                        description={kpi.trend ? "vs mes anterior" : undefined}
                    />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Main Chart - Revenue vs Expenses */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Ingresos vs Gastos</CardTitle>
                        <CardDescription>Comparativa mensual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[320px] w-full">
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
                        <div className="h-[320px] w-full">
                            {chartData.monthlyOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <FileText className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="text-sm font-medium">
                                        Sin órdenes registradas
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Crea tu primera orden de servicio
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
                                                    {(alert.client ||
                                                        alert.order) && (
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
