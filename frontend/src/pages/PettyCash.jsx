import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    DollarSign,
    FileText,
    TrendingUp,
    TrendingDown,
    Calculator,
    Wallet,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    History,
    FileCheck,
    Search,
    Eye,
    Edit2,
    Trash2,
    Filter,
    XCircle,
    Download,
    FileDown,
} from "lucide-react";
import {
    DataTable,
    Button,
    Modal,
    ModalFooter,
    Input,
    Label,
    Badge,
    SelectERP,
    ConfirmDialog,
    ExportButton,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";

// ============================================
// HELPERS
// ============================================

/**
 * Formatea una fecha a dd/mm/yyyy evitando problemas de timezone
 * @param {string} dateString - Fecha en formato ISO o YYYY-MM-DD
 * @returns {string} Fecha en formato dd/mm/yyyy
 */
const formatDate = (dateString) => {
    if (!dateString) return "";

    // Si es un string, extraer solo la parte de fecha si viene con hora (ISO)
    const dateOnly = String(dateString).split("T")[0];

    // Parsear usando regex para evitar timezone issues
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dateString; // Si no coincide con el formato, retornar tal cual

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
};

/**
 * Formatea una fecha con hora a dd/mm/yyyy HH:mm evitando problemas de timezone
 * @param {string} dateTimeString - Fecha con hora en formato ISO
 * @returns {string} Fecha con hora en formato dd/mm/yyyy HH:mm
 */
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "";
    // Extraer componentes directamente del string ISO sin crear Date object
    // Formato ISO: "2026-01-04T19:45:32.617300-06:00"
    const parts = dateTimeString.match(
        /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
    );
    if (!parts) return dateTimeString;

    const [, year, month, day, hours, minutes] = parts;
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// ============================================
// CONFIGURACIÓN (Lógica Mejorada)
// ============================================

const EXPENSE_CATEGORIES = [
    { id: "INGRESO", name: "Ingresos / Reembolsos" },
    { id: "ALIMENTOS", name: "Alimentación / Cafetería" },
    { id: "TRANSPORTE", name: "Transporte / Combustible / Taxis" },
    { id: "PAPELERIA", name: "Papelería y Útiles de Oficina" },
    { id: "ASEO", name: "Artículos de Aseo y Limpieza" },
    { id: "MANTENIM", name: "Mantenimiento y Reparaciones" },
    { id: "TRAMITES", name: "Trámites y Diligencias" },
    { id: "OTROS", name: "Otros Gastos Varios" },
];

// Fecha local sin desfase de timezone para inputs tipo date
const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
};

const getInitialFormState = () => ({
    transaction_type: "EXPENSE",
    amount: "",
    transaction_date: getLocalToday(),
    concept: "",
    beneficiary: "",
    reference_number: "",
    category_code: "",
    service_order_ref: "",
    nit_dui: "",
    nrc: "",
});

// ============================================
// COMPONENTES UI (Estilo ERP Corporativo)
// ============================================

const KPICard = ({ label, value, icon: Icon }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                    {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {value}
                </p>
            </div>
            <div className="p-4 rounded-xl border flex-shrink-0 bg-slate-50 border-slate-100 text-slate-400">
                {Icon && <Icon className="w-6 h-6" />}
            </div>
        </div>
    );
};

const CashCountModal = ({
    isOpen,
    onClose,
    onSuccess,
    currentSystemBalance,
}) => {
    const DENOMINATIONS = [
        { value: 100, label: "$100" },
        { value: 50, label: "$50" },
        { value: 20, label: "$20" },
        { value: 10, label: "$10" },
        { value: 5, label: "$5" },
        { value: 1, label: "$1" },
        { value: 0.25, label: "$0.25" },
        { value: 0.1, label: "$0.10" },
        { value: 0.05, label: "$0.05" },
        { value: 0.01, label: "$0.01" },
    ];

    const [counts, setCounts] = useState({});
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const initial = {};
            DENOMINATIONS.forEach((d) => (initial[d.value] = ""));
            setCounts(initial);
            setNotes("");
        }
        // DENOMINATIONS is static; omit from deps intentionally
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const calculateTotal = () => {
        return DENOMINATIONS.reduce((acc, curr) => {
            const qty = parseInt(counts[curr.value] || 0);
            return acc + qty * curr.value;
        }, 0);
    };

    const handleCountChange = (value, qty) => {
        setCounts((prev) => ({ ...prev, [value]: qty }));
    };

    const totalPhysical = calculateTotal();
    const difference = totalPhysical - currentSystemBalance;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const details = Object.entries(counts)
                .filter(([, qty]) => qty && parseInt(qty) > 0)
                .map(([denom, qty]) => ({
                    denomination: parseFloat(denom),
                    quantity: parseInt(qty),
                }));

            await axios.post("/petty-cash/cash-counts/", {
                actual_balance: totalPhysical,
                notes,
                details,
            });

            toast.success("Arqueo registrado correctamente");
            onSuccess();
            onClose();
        } catch {
            toast.error("Error al guardar el arqueo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Realizar Arqueo de Caja"
            size="xl"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-slate-700">
                            Conteo de Efectivo
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {DENOMINATIONS.map((denom) => (
                                <div
                                    key={denom.value}
                                    className="flex items-center gap-3"
                                >
                                    <span className="w-16 text-right font-mono text-slate-600">
                                        {denom.label}
                                    </span>
                                    <span className="text-slate-400">x</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={counts[denom.value]}
                                        onChange={(e) =>
                                            handleCountChange(
                                                denom.value,
                                                e.target.value
                                            )
                                        }
                                        className="w-24 text-center"
                                    />
                                    <span className="text-slate-300">=</span>
                                    <span className="w-20 text-right font-mono font-medium text-slate-700">
                                        {formatCurrency(
                                            parseInt(counts[denom.value] || 0) *
                                                denom.value
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit space-y-6">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">
                                Saldo en Sistema
                            </p>
                            <p className="text-xl font-bold text-slate-700 font-mono">
                                {formatCurrency(currentSystemBalance)}
                            </p>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">
                                Total Contado
                            </p>
                            <p className="text-3xl font-bold text-slate-900 font-mono">
                                {formatCurrency(totalPhysical)}
                            </p>
                        </div>
                        <div
                            className={cn(
                                "p-4 rounded-lg border",
                                difference === 0
                                    ? "bg-slate-50 border-slate-200 text-slate-700"
                                    : difference > 0
                                    ? "bg-slate-50 border-slate-200 text-slate-700"
                                    : "bg-slate-100 border-slate-300 text-slate-800"
                            )}
                        >
                            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500">
                                Diferencia
                            </p>
                            <p className="text-xl font-bold font-mono">
                                {difference > 0 ? "+" : ""}
                                {formatCurrency(difference)}
                            </p>
                        </div>
                        <div>
                            <Label className="mb-2 block">
                                Notas / Observaciones
                            </Label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Explica cualquier diferencia..."
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        {loading ? "Guardando..." : "Guardar Arqueo"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const TransactionDetailsModal = ({ isOpen, onClose, transaction }) => {
    if (!transaction) return null;
    const categoryName =
        EXPENSE_CATEGORIES.find((c) => c.id === transaction.category_code)
            ?.name ||
        transaction.category_code ||
        "-";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalle Completo"
            size="lg"
        >
            <div className="space-y-6">
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">
                        {transaction.transaction_type === "INCOME"
                            ? "Ingreso"
                            : "Gasto"}
                    </p>
                    <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                        {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-slate-600 font-medium mt-2">
                        {transaction.concept}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-xs text-slate-400">Fecha</Label>
                        <p className="font-medium text-slate-700">
                            {formatDate(transaction.transaction_date)}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">
                            Categoría
                        </Label>
                        <p className="font-medium text-slate-700">
                            {categoryName}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">
                            Beneficiario
                        </Label>
                        <p className="text-slate-600">
                            {transaction.beneficiary || "-"}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">
                            Referencia
                        </Label>
                        <p className="font-mono text-slate-600">
                            {transaction.reference_number || "-"}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">NIT</Label>
                        <p className="font-mono text-slate-600">
                            {transaction.nit || "-"}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">NRC</Label>
                        <p className="font-mono text-slate-600">
                            {transaction.nrc || "-"}
                        </p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">DUI</Label>
                        <p className="font-mono text-slate-600">
                            {transaction.dui || "-"}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <Label className="text-xs text-slate-400">
                            Orden de Servicio
                        </Label>
                        <p className="font-mono text-slate-600">
                            {transaction.service_order_ref || "N/A"}
                        </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-100 mt-2">
                        <Label className="text-xs text-slate-400">Solicitado por</Label>
                        <p className="font-medium text-slate-700">
                            {transaction.created_by_name || "-"}
                        </p>
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        onClick={onClose}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        Cerrar
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
};

const EditTransactionModal = ({ isOpen, onClose, transaction, onSuccess }) => {
    const [formData, setFormData] = useState(() => getInitialFormState());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (transaction) {
            setFormData({
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                transaction_date: transaction.transaction_date,
                concept: transaction.concept,
                beneficiary: transaction.beneficiary || "",
                reference_number: transaction.reference_number || "",
                category_code: transaction.category_code || "",
                service_order_ref: transaction.service_order_ref || "",
                nit: transaction.nit || "",
                dui: transaction.dui || "",
                nrc: transaction.nrc || "",
            });
        }
    }, [transaction]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(
                `/petty-cash/transactions/${transaction.id}/`,
                formData
            );
            toast.success("Movimiento actualizado correctamente");
            onSuccess();
            onClose();
        } catch {
            toast.error("Error al actualizar movimiento");
        } finally {
            setLoading(false);
        }
    };

    if (!transaction) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Movimiento"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Fecha</Label>
                        <Input
                            type="date"
                            value={formData.transaction_date}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    transaction_date: e.target.value,
                                })
                            }
                            required
                        />
                    </div>
                    <div>
                        <Label>Monto</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    amount: e.target.value,
                                })
                            }
                            className="font-bold"
                            required
                        />
                    </div>
                </div>
                <div>
                    <Label>Concepto</Label>
                    <Input
                        value={formData.concept}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                concept: e.target.value,
                            })
                        }
                        required
                    />
                </div>
                <div>
                    <Label>Categoría</Label>
                    <SelectERP
                        options={EXPENSE_CATEGORIES}
                        value={formData.category_code}
                        onChange={(val) =>
                            setFormData({ ...formData, category_code: val })
                        }
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Beneficiario</Label>
                        <Input
                            value={formData.beneficiary}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    beneficiary: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label>Factura/Ref</Label>
                        <Input
                            value={formData.reference_number}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    reference_number: e.target.value,
                                })
                            }
                        />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label>Orden Servicio</Label>
                        <Input
                            value={formData.service_order_ref}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    service_order_ref: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label>NIT</Label>
                        <Input
                            value={formData.nit}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nit: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label>NRC</Label>
                        <Input
                            value={formData.nrc}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nrc: e.target.value,
                                })
                            }
                        />
                    </div>
                </div>
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

const CashCountHistoryDetailModal = ({ isOpen, onClose, cashCount }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && cashCount) {
            fetchTransactions();
        }
    }, [isOpen, cashCount]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `/petty-cash/transactions/?cash_count_id=${cashCount.id}`
            );
            setTransactions(res.data);
        } catch (error) {
            toast.error("Error al cargar detalles del arqueo");
        } finally {
            setLoading(false);
        }
    };

    if (!cashCount) return null;

    // Calcular totales
    const totalIncome = transactions
        .filter((t) => t.transaction_type === "INCOME")
        .reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = transactions
        .filter((t) => t.transaction_type === "EXPENSE")
        .reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    const columns = [
        {
            header: "Fecha",
            accessor: "transaction_date",
            cell: (row) => (
                <div className="text-slate-600 tabular-nums text-xs">
                    {formatDate(row.transaction_date)}
                </div>
            ),
        },
        {
            header: "Tipo",
            accessor: "transaction_type",
            cell: (row) => (
                <Badge
                    className={cn(
                        "text-[10px] border px-1.5 py-0.5",
                        row.transaction_type === "INCOME"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                >
                    {row.transaction_type === "INCOME" ? "Ing" : "Gas"}
                </Badge>
            ),
        },
        {
            header: "Concepto",
            accessor: "concept",
            cell: (row) => (
                <div>
                    <div className="font-medium text-slate-900 text-sm">
                        {row.concept}
                    </div>
                    <div className="text-[10px] text-slate-500">
                        {row.beneficiary} {row.reference_number ? `• ${row.reference_number}` : ''}
                    </div>
                </div>
            ),
        },
        {
            header: "Monto",
            accessor: "amount",
            className: "text-right",
            cell: (row) => (
                <div className={cn(
                    "tabular-nums text-sm font-semibold",
                    row.transaction_type === "INCOME" ? "text-emerald-700" : "text-slate-700"
                )}>
                    {formatCurrency(row.amount)}
                </div>
            ),
        },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Historial: Caja ${cashCount.sequence_number || cashCount.id} - ${formatDate(cashCount.date)}`}
            size="4xl"
        >
            <div className="space-y-6">
                {/* Resumen del Arqueo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Ingresos</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Gastos</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Balance</p>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(balance)}</p>
                    </div>
                     <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Arqueo Físico</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(cashCount.actual_balance)}</p>
                        {Number(cashCount.difference) !== 0 && (
                            <span className="text-xs font-bold text-red-500">
                                Dif: {formatCurrency(cashCount.difference)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    <DataTable
                        data={transactions}
                        columns={columns}
                        loading={loading}
                        emptyMessage="No hay movimientos en este arqueo."
                        searchable={false}
                        density="compact"
                    />
                </div>
                
                <ModalFooter>
                     <Button onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800">
                        Cerrar
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const PettyCash = () => {
    const [activeTab, setActiveTab] = useState("transactions");
    const [transactions, setTransactions] = useState([]);
    const [cashCounts, setCashCounts] = useState([]);
    const [balanceInfo, setBalanceInfo] = useState({
        balance: 0,
        total_income: 0,
        total_expenses: 0,
    });
    const [loading, setLoading] = useState(true);
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCountModalOpen, setIsCountModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleteCountDialogOpen, setIsDeleteCountDialogOpen] =
        useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [selectedCashCount, setSelectedCashCount] = useState(null);
    const [cashCountToDelete, setCashCountToDelete] = useState(null);
    const [formData, setFormData] = useState(() => getInitialFormState());
    const [searchTerm, setSearchTerm] = useState("");

    // Filtros
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({
        transaction_type: "",
        category_code: "",
        dateFrom: "",
        dateTo: "",
    });
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [txRes, balanceRes] = await Promise.all([
                axios.get("/petty-cash/transactions/?active=true"),
                axios.get("/petty-cash/transactions/balance/"),
            ]);
            setTransactions(txRes.data);
            setBalanceInfo(balanceRes.data);
        } catch {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const fetchCashCounts = async () => {
        setLoadingCounts(true);
        try {
            const response = await axios.get("/petty-cash/cash-counts/");
            setCashCounts(response.data);
        } catch {
            toast.error("Error cargando arqueos");
        } finally {
            setLoadingCounts(false);
        }
    };

    useEffect(() => {
        if (activeTab === "history") {
            fetchCashCounts();
        }
    }, [activeTab]);

    const handleOpenModal = (type = "EXPENSE") => {
        setFormData({ ...getInitialFormState(), transaction_type: type });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post("/petty-cash/transactions/", formData);
            toast.success("Movimiento registrado");
            setIsModalOpen(false);
            fetchData();
        } catch {
            toast.error("Error registrando movimiento");
        }
    };

    const handleEdit = (transaction) => {
        setSelectedTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleViewDetail = (transaction) => {
        setSelectedTransaction(transaction);
    };

    const handleUpdateSubmit = () => {
        fetchData();
    };

    const handleDeleteClick = (transaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!transactionToDelete) return;
        try {
            await axios.delete(
                `/petty-cash/transactions/${transactionToDelete.id}/`
            );
            toast.success("Movimiento eliminado correctamente");
            fetchData();
            setIsDeleteDialogOpen(false);
            setTransactionToDelete(null);
        } catch {
            toast.error("Error al eliminar movimiento");
        }
    };

    const handleDeleteCashCountClick = (cashCount) => {
        setCashCountToDelete(cashCount);
        setIsDeleteCountDialogOpen(true);
    };

    const handleDeleteCashCountConfirm = async () => {
        if (!cashCountToDelete) return;
        try {
            await axios.delete(
                `/petty-cash/cash-counts/${cashCountToDelete.id}/`
            );
            toast.success("Arqueo eliminado correctamente");
            fetchCashCounts();
            fetchData(); // Refrescar balance también
            setIsDeleteCountDialogOpen(false);
            setCashCountToDelete(null);
        } catch {
            toast.error("Error al eliminar arqueo");
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.transaction_type)
                params.append("transaction_type", filters.transaction_type);
            if (filters.category_code)
                params.append("category_code", filters.category_code);
            if (filters.dateFrom) params.append("date_from", filters.dateFrom);
            if (filters.dateTo) params.append("date_to", filters.dateTo);

            const response = await axios.get(
                `/petty-cash/transactions/export_excel/?${params.toString()}`,
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `caja_chica_${new Date().toISOString().split("T")[0]}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Archivo exportado correctamente");
        } catch {
            toast.error("Error al exportar archivo");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCashCounts = async () => {
        setIsExporting(true);
        try {
            const response = await axios.get(
                `/petty-cash/cash-counts/export_excel/`,
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `arqueos_caja_chica_${
                    new Date().toISOString().split("T")[0]
                }.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Archivo exportado correctamente");
        } catch {
            toast.error("Error al exportar archivo");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportDenominations = async (cashCountId) => {
        try {
            const response = await axios.get(
                `/petty-cash/cash-counts/${cashCountId}/export_denomination_detail/`,
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `detalle_denominaciones_${
                    new Date().toISOString().split("T")[0]
                }.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Detalle de denominaciones exportado");
        } catch {
            toast.error("Error al exportar detalle");
        }
    };

    const clearFilters = () => {
        setFilters({
            transaction_type: "",
            category_code: "",
            dateFrom: "",
            dateTo: "",
        });
    };

    // Filtrado con useMemo
    const filteredData = useMemo(() => {
        return transactions.filter((t) => {
            const matchesSearch =
                !searchTerm ||
                t.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.beneficiary &&
                    t.beneficiary
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()));

            const matchesType =
                !filters.transaction_type ||
                t.transaction_type === filters.transaction_type;

            const matchesCategory =
                !filters.category_code ||
                t.category_code === filters.category_code;

            const matchesDateFrom =
                !filters.dateFrom || t.transaction_date >= filters.dateFrom;
            const matchesDateTo =
                !filters.dateTo || t.transaction_date <= filters.dateTo;

            return (
                matchesSearch &&
                matchesType &&
                matchesCategory &&
                matchesDateFrom &&
                matchesDateTo
            );
        });
    }, [transactions, searchTerm, filters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.transaction_type) count++;
        if (filters.category_code) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    }, [filters]);

    const cashCountColumns = [
        {
            header: "Caja #",
            accessor: "sequence_number",
            className: "w-[80px] text-center",
            cell: (row) => (
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                    #{row.sequence_number}
                </span>
            )
        },
        {
            header: "Fecha",
            accessor: "date",
            cell: (row) => (
                <div className="text-slate-600 tabular-nums">
                    {formatDateTime(row.created_at)}
                </div>
            ),
        },
        {
            header: "Saldo Sistema",
            accessor: "calculated_balance",
            className: "text-right",
            cell: (row) => (
                <span className="font-semibold text-slate-700">
                    {formatCurrency(row.calculated_balance)}
                </span>
            ),
        },
        {
            header: "Efectivo Contado",
            accessor: "actual_balance",
            className: "text-right",
            cell: (row) => (
                <span className="font-semibold text-slate-900">
                    {formatCurrency(row.actual_balance)}
                </span>
            ),
        },
        {
            header: "Diferencia",
            accessor: "difference",
            className: "text-right",
            cell: (row) => {
                const diff = parseFloat(row.difference || 0);
                return (
                    <span
                        className={cn(
                            "font-bold",
                            diff === 0
                                ? "text-slate-600"
                                : diff > 0
                                ? "text-slate-900"
                                : "text-red-600"
                        )}
                    >
                        {diff > 0 ? "+" : ""}
                        {formatCurrency(diff)}
                    </span>
                );
            },
        },
        {
            header: "Usuario",
            accessor: "performed_by",
            cell: (row) => (
                <div className="text-slate-600 text-sm">
                    {row.performed_by_name || "—"}
                </div>
            ),
        },
        {
            header: "Notas",
            accessor: "notes",
            cell: (row) => (
                <div className="text-slate-500 text-xs max-w-xs truncate">
                    {row.notes || "—"}
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "id",
            className: "w-[240px] text-center",
            cell: (row) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCashCount(row);
                        }}
                        className="h-8 px-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-300 font-medium"
                    >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        <span className="text-xs">Ver Detalle</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleExportDenominations(row.id);
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Exportar detalle de denominaciones"
                    >
                        <FileDown className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCashCountClick(row);
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar arqueo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const columns = [
        {
            header: "Fecha",
            accessor: "transaction_date",
            cell: (row) => (
                <div className="text-slate-600 tabular-nums">
                    {formatDate(row.transaction_date)}
                </div>
            ),
        },
        {
            header: "Tipo",
            accessor: "transaction_type",
            cell: (row) => (
                <Badge
                    className={cn(
                        "text-[11px] border",
                        row.transaction_type === "INCOME"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                >
                    {row.transaction_type === "INCOME" ? "Ingreso" : "Gasto"}
                </Badge>
            ),
        },
        {
            header: "Concepto / Beneficiario",
            accessor: "concept",
            cell: (row) => (
                <div>
                    <div className="font-medium text-slate-900">
                        {row.concept}
                    </div>
                    <div className="text-xs text-slate-500 flex gap-2">
                        {row.beneficiary && <span>{row.beneficiary}</span>}
                        {row.reference_number && (
                            <span>• Ref: {row.reference_number}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Categoría",
            accessor: "category_code",
            cell: (row) => {
                const cat = EXPENSE_CATEGORIES.find(
                    (c) => c.id === row.category_code
                );
                return row.category_code ? (
                    <Badge className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px]">
                        {cat ? cat.name.split("/")[0] : row.category_code}
                    </Badge>
                ) : null;
            },
        },
        {
            header: "Monto",
            accessor: "amount",
            className: "text-right",
            headerClassName: "text-right",
            cell: (row) => (
                <div className="flex items-center justify-end gap-2 tabular-nums">
                    {row.transaction_type === "INCOME" ? (
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ArrowDownRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-semibold text-slate-900">
                        {formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Solicitado por",
            accessor: "created_by_name",
            className: "text-center",
            headerClassName: "text-center",
            cell: (row) => (
                <div className="text-slate-500 text-xs truncate max-w-[120px] mx-auto">
                    {row.created_by_name || "—"}
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[120px]",
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(row)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(row)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(row)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 mt-2 animate-in fade-in duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    label="Total Ingresos"
                    value={formatCurrency(balanceInfo.total_income)}
                    icon={TrendingUp}
                />
                <KPICard
                    label="Total Gastos"
                    value={formatCurrency(balanceInfo.total_expenses)}
                    icon={TrendingDown}
                />
                <KPICard
                    label="Saldo Actual"
                    value={formatCurrency(balanceInfo.balance)}
                    icon={Wallet}
                />
            </div>

            {/* Main Card with Tabs and Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Barra de Herramientas Unificada */}
                <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Izquierda: Tabs + Búsqueda + Filtros */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-3xl">
                            {/* Tabs */}
                            <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 w-full sm:w-auto shrink-0">
                                <button
                                    onClick={() => setActiveTab("transactions")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "transactions"
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    Movimientos
                                </button>
                                <button
                                    onClick={() => setActiveTab("history")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "history"
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    Historial
                                </button>
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

                            {/* Búsqueda + Filtros */}
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Buscar movimiento..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                    />
                                </div>
                                {activeTab === "transactions" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setIsFiltersOpen(!isFiltersOpen)
                                        }
                                        className={cn(
                                            "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all h-10 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap",
                                            isFiltersOpen &&
                                                "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                                        )}
                                    >
                                        <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-2 text-slate-500" />
                                        <span className="hidden sm:inline">
                                            Filtros
                                        </span>
                                        {activeFiltersCount > 0 && (
                                            <span className="ml-1 sm:ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-full">
                                                {activeFiltersCount}
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Derecha: Acciones */}
                        <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
                            {activeTab === "transactions" ? (
                                <ExportButton
                                    onExportAll={handleExportExcel}
                                    onExportFiltered={handleExportExcel}
                                    filteredCount={filteredData.length}
                                    totalCount={transactions.length}
                                    isExporting={isExporting}
                                    allLabel="Todos los Movimientos"
                                    allDescription="Exportar registro completo"
                                    filteredLabel="Filtrados"
                                    filteredDescription="Solo visibles"
                                />
                            ) : (
                                <ExportButton
                                    onExportAll={handleExportCashCounts}
                                    onExportFiltered={handleExportCashCounts}
                                    filteredCount={cashCounts.length}
                                    totalCount={cashCounts.length}
                                    isExporting={isExporting}
                                    allLabel="Todos los Arqueos"
                                    allDescription="Exportar historial completo"
                                    filteredLabel="Arqueos"
                                    filteredDescription="Exportar visibles"
                                />
                            )}

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCountModalOpen(true)}
                                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 h-10 sm:h-9 px-3 sm:px-4 transition-all whitespace-nowrap"
                            >
                                <Calculator className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Arqueo</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => handleOpenModal("INCOME")}
                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-10 sm:h-9 px-3 sm:px-4 transition-all active:scale-95 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                                Nuevo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {isFiltersOpen && (
                    <div className="p-5 bg-slate-50/50 border-b border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <Label className="text-xs font-medium text-slate-700 mb-2 block">
                                    Tipo
                                </Label>
                                <select
                                    value={filters.transaction_type}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            transaction_type: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                >
                                    <option value="">Todos</option>
                                    <option value="INCOME">Ingresos</option>
                                    <option value="EXPENSE">Gastos</option>
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs font-medium text-slate-700 mb-2 block">
                                    Categoría
                                </Label>
                                <select
                                    value={filters.category_code}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            category_code: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                >
                                    <option value="">Todas</option>
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs font-medium text-slate-700 mb-2 block">
                                    Desde
                                </Label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            dateFrom: e.target.value,
                                        })
                                    }
                                    className="text-sm h-[38px]"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-medium text-slate-700 mb-2 block">
                                    Hasta
                                </Label>
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            dateTo: e.target.value,
                                        })
                                    }
                                    className="text-sm h-[38px]"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="w-full h-[38px] text-slate-700 border-slate-300 hover:bg-white hover:text-slate-900"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Limpiar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Content - Mostrar según tab activo */}
                {activeTab === "transactions" ? (
                    <DataTable
                        data={filteredData}
                        columns={columns}
                        loading={loading}
                        emptyMessage="No hay movimientos registrados."
                        searchable={false}
                    />
                ) : (
                    <DataTable
                        data={cashCounts}
                        columns={cashCountColumns}
                        loading={loadingCounts}
                        emptyMessage="No hay arqueos registrados."
                        searchable={false}
                    />
                )}
            </div>

            {/* Modal de Transacción */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Registrar Movimiento"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Selector de Tipo de Transacción - Segmented Control */}
                    <div>
                        <Label className="mb-2.5 block text-sm font-medium text-slate-700">
                            Tipo de Movimiento
                        </Label>
                        <div className="inline-flex bg-slate-100 p-1 rounded-lg w-full">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        transaction_type: "INCOME",
                                    })
                                }
                                className={cn(
                                    "flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200",
                                    formData.transaction_type === "INCOME"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Ingreso
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        transaction_type: "EXPENSE",
                                    })
                                }
                                className={cn(
                                    "flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200",
                                    formData.transaction_type === "EXPENSE"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Gasto
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={formData.transaction_date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        transaction_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <Label>Monto</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        amount: e.target.value,
                                    })
                                }
                                className="font-bold"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Concepto</Label>
                        <Input
                            placeholder="Ej: Compra de materiales, Pago de servicio..."
                            value={formData.concept}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    concept: e.target.value,
                                })
                            }
                            required
                        />
                    </div>
                    <div>
                        <Label>Categoría</Label>
                        <SelectERP
                            options={EXPENSE_CATEGORIES}
                            value={formData.category_code}
                            onChange={(val) =>
                                setFormData({ ...formData, category_code: val })
                            }
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Beneficiario</Label>
                            <Input
                                placeholder="Nombre del proveedor o persona"
                                value={formData.beneficiary}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        beneficiary: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>Factura/Ref</Label>
                            <Input
                                placeholder="F001-00123456"
                                value={formData.reference_number}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        reference_number: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Orden Servicio</Label>
                            <Input
                                placeholder="OS-2025-001"
                                value={formData.service_order_ref}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        service_order_ref: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>DUI/NIT</Label>
                            <Input
                                placeholder="0614-123456-123-4 o NIT"
                                value={formData.nit_dui}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nit_dui: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>NRC</Label>
                            <Input
                                placeholder="Registro IVA"
                                value={formData.nrc}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nrc: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            Guardar
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            <CashCountModal
                isOpen={isCountModalOpen}
                onClose={() => setIsCountModalOpen(false)}
                onSuccess={fetchData}
                currentSystemBalance={balanceInfo.balance}
            />

            <EditTransactionModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedTransaction(null);
                }}
                transaction={selectedTransaction}
                onSuccess={handleUpdateSubmit}
            />

            <TransactionDetailsModal
                isOpen={!!selectedTransaction && !isEditModalOpen}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
            />

            <CashCountHistoryDetailModal
                isOpen={!!selectedCashCount}
                onClose={() => setSelectedCashCount(null)}
                cashCount={selectedCashCount}
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setTransactionToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Eliminar Movimiento"
                description={`¿Estás seguro de que deseas eliminar el movimiento "${transactionToDelete?.concept}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
            />

            <ConfirmDialog
                open={isDeleteCountDialogOpen}
                onClose={() => {
                    setIsDeleteCountDialogOpen(false);
                    setCashCountToDelete(null);
                }}
                onConfirm={handleDeleteCashCountConfirm}
                title="Eliminar Arqueo"
                description={`¿Estás seguro de que deseas eliminar este arqueo${
                    cashCountToDelete?.date || cashCountToDelete?.created_at
                        ? ` del ${formatDate(
                              cashCountToDelete.date ||
                                  cashCountToDelete.created_at
                          )}`
                        : ""
                }? Esta acción no se puede deshacer y afectará el historial de arqueos.`}
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
};

export default PettyCash;
