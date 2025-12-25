import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Calendar,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Info,
    FileText,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    Badge,
    Button,
    Input,
    Label,
    SelectERP,
} from "../components/ui";
import { LoadingState } from "../components/ui/Spinner";
import api from "../lib/axios";
import { cn, formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";

/**
 * ClientForm - Formulario completo para crear/editar clientes
 * Design System Corporativo GPRO
 * Incluye gestión de créditos y días de vencimiento
 */
function ClientForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        // Información básica
        name: "",
        legal_name: "",
        nit: "",
        iva_registration: "",

        // Contacto
        address: "",
        phone: "",
        secondary_phone: "",
        email: "",
        contact_person: "",

        // Condiciones de pago
        payment_condition: "contado",
        credit_days: 0,
        credit_limit: 0,

        // Configuración fiscal
        is_gran_contribuyente: false,

        // Estado
        is_active: true,
        notes: "",
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEditing) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clients/${id}/`);
            setFormData(response.data);
        } catch (error) {
            toast.error("Error al cargar cliente");
            navigate("/clients");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when field is modified
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        }
        if (!formData.nit.trim()) {
            newErrors.nit = "El NIT es requerido";
        }
        if (!formData.address.trim()) {
            newErrors.address = "La dirección es requerida";
        }
        if (
            formData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
            newErrors.email = "Email inválido";
        }
        if (formData.payment_condition === "credito") {
            if (!formData.credit_days || formData.credit_days <= 0) {
                newErrors.credit_days =
                    "Los días de crédito son requeridos para condición de crédito";
            }
            if (!formData.credit_limit || formData.credit_limit <= 0) {
                newErrors.credit_limit = "El límite de crédito es requerido";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor corrija los errores del formulario");
            return;
        }

        try {
            setSaving(true);

            const dataToSend = {
                ...formData,
                credit_days:
                    formData.payment_condition === "credito"
                        ? parseInt(formData.credit_days)
                        : 0,
                credit_limit:
                    formData.payment_condition === "credito"
                        ? parseFloat(formData.credit_limit)
                        : 0,
            };

            if (isEditing) {
                await api.patch(`/clients/${id}/`, dataToSend);
                toast.success("Cliente actualizado exitosamente");
            } else {
                await api.post("/clients/", dataToSend);
                toast.success("Cliente creado exitosamente");
            }

            navigate("/clients");
        } catch (error) {
            const errorMessage =
                error.response?.data?.nit?.[0] ||
                error.response?.data?.detail ||
                "Error al guardar cliente";
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingState message="Cargando datos del cliente..." />;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/clients")}
                    className="gap-1.5 text-slate-500 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Básica */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle>Información de la Empresa</CardTitle>
                                <CardDescription>
                                    Datos fiscales y de identificación
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label required>Nombre / Razón Social</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        handleChange("name", e.target.value)
                                    }
                                    placeholder="Ej: Importadora ABC, S.A. de C.V."
                                    error={errors.name}
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Label>Nombre Jurídico Completo</Label>
                                <Input
                                    value={formData.legal_name}
                                    onChange={(e) =>
                                        handleChange(
                                            "legal_name",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Nombre completo según escritura de constitución"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Opcional. Usar si difiere del nombre
                                    comercial.
                                </p>
                            </div>

                            <div>
                                <Label required>NIT / Tax ID</Label>
                                <Input
                                    value={formData.nit}
                                    onChange={(e) =>
                                        handleChange("nit", e.target.value)
                                    }
                                    placeholder="Ej: 0614-123456-001-0"
                                    className="font-mono"
                                    error={errors.nit}
                                />
                                {errors.nit && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {errors.nit}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Registro de IVA</Label>
                                <Input
                                    value={formData.iva_registration}
                                    onChange={(e) =>
                                        handleChange(
                                            "iva_registration",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Número de registro de IVA"
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        {/* Gran Contribuyente */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="is_gran_contribuyente"
                                    checked={formData.is_gran_contribuyente}
                                    onChange={(e) =>
                                        handleChange(
                                            "is_gran_contribuyente",
                                            e.target.checked
                                        )
                                    }
                                    className="mt-1 h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-500"
                                />
                                <div>
                                    <label
                                        htmlFor="is_gran_contribuyente"
                                        className="text-sm font-medium text-slate-900 cursor-pointer"
                                    >
                                        Gran Contribuyente
                                    </label>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Si está marcado, se aplicará retención
                                        del 1% en facturas CCF (El Salvador).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Información de Contacto */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <User className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle>Información de Contacto</CardTitle>
                                <CardDescription>
                                    Datos para comunicación y envío de
                                    documentos
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label required>Dirección</Label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) =>
                                        handleChange("address", e.target.value)
                                    }
                                    placeholder="Dirección completa incluyendo ciudad y país"
                                    rows={2}
                                    className={cn(
                                        "w-full px-3 py-2 text-sm border rounded-md resize-none",
                                        "bg-white text-slate-900 placeholder:text-slate-400",
                                        "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                                        errors.address
                                            ? "border-red-500"
                                            : "border-slate-200"
                                    )}
                                />
                                {errors.address && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {errors.address}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Teléfono Principal</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) =>
                                        handleChange("phone", e.target.value)
                                    }
                                    placeholder="Ej: +503 2222-3333"
                                    type="tel"
                                />
                            </div>

                            <div>
                                <Label>Teléfono Secundario</Label>
                                <Input
                                    value={formData.secondary_phone}
                                    onChange={(e) =>
                                        handleChange(
                                            "secondary_phone",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej: +503 7777-8888"
                                    type="tel"
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    value={formData.email}
                                    onChange={(e) =>
                                        handleChange("email", e.target.value)
                                    }
                                    placeholder="contacto@empresa.com"
                                    type="email"
                                    error={errors.email}
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Persona de Contacto</Label>
                                <Input
                                    value={formData.contact_person}
                                    onChange={(e) =>
                                        handleChange(
                                            "contact_person",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Nombre del contacto principal"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Condiciones de Pago y Crédito */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <CreditCard className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle>
                                    Condiciones de Pago y Crédito
                                </CardTitle>
                                <CardDescription>
                                    Configuración de términos de pago y límites
                                    de crédito
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label required>Condición de Pago</Label>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleChange(
                                            "payment_condition",
                                            "contado"
                                        )
                                    }
                                    className={cn(
                                        "p-4 rounded-lg border-2 text-left transition-all",
                                        formData.payment_condition === "contado"
                                            ? "border-slate-900 bg-slate-50"
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                formData.payment_condition ===
                                                    "contado"
                                                    ? "border-slate-900"
                                                    : "border-slate-300"
                                            )}
                                        >
                                            {formData.payment_condition ===
                                                "contado" && (
                                                <div className="w-2 h-2 rounded-full bg-slate-900" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                Contado
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Pago inmediato al momento de
                                                facturar
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleChange(
                                            "payment_condition",
                                            "credito"
                                        )
                                    }
                                    className={cn(
                                        "p-4 rounded-lg border-2 text-left transition-all",
                                        formData.payment_condition === "credito"
                                            ? "border-slate-900 bg-slate-50"
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                formData.payment_condition ===
                                                    "credito"
                                                    ? "border-slate-900"
                                                    : "border-slate-300"
                                            )}
                                        >
                                            {formData.payment_condition ===
                                                "credito" && (
                                                <div className="w-2 h-2 rounded-full bg-slate-900" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                Crédito
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Pago diferido según días
                                                acordados
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Campos de Crédito */}
                        {formData.payment_condition === "credito" && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Info className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        Configuración de Crédito
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label required>Días de Crédito</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={formData.credit_days}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "credit_days",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="30"
                                                error={errors.credit_days}
                                                className="pr-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                                                días
                                            </span>
                                        </div>
                                        {errors.credit_days && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {errors.credit_days}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Las facturas vencerán
                                            automáticamente después de este
                                            plazo
                                        </p>
                                    </div>

                                    <div>
                                        <Label required>
                                            Límite de Crédito
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={formData.credit_limit}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "credit_limit",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="10,000.00"
                                                className="pl-7"
                                                error={errors.credit_limit}
                                            />
                                        </div>
                                        {errors.credit_limit && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {errors.credit_limit}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            Monto máximo de crédito permitido
                                        </p>
                                    </div>
                                </div>

                                {/* Preview de vencimiento */}
                                {formData.credit_days > 0 && (
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <p className="text-sm text-slate-700">
                                            <span className="font-medium">
                                                Ejemplo:
                                            </span>{" "}
                                            Una factura emitida hoy (
                                            {new Date().toLocaleDateString(
                                                "es-SV"
                                            )}
                                            ) vencerá el{" "}
                                            <span className="font-semibold">
                                                {new Date(
                                                    Date.now() +
                                                        formData.credit_days *
                                                            24 *
                                                            60 *
                                                            60 *
                                                            1000
                                                ).toLocaleDateString("es-SV", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notas y Estado */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <FileText className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle>Notas y Estado</CardTitle>
                                <CardDescription>
                                    Información adicional y estado del cliente
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Notas Internas</Label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) =>
                                    handleChange("notes", e.target.value)
                                }
                                placeholder="Observaciones, acuerdos especiales, información relevante..."
                                rows={3}
                                className={cn(
                                    "w-full px-3 py-2 text-sm border rounded-md resize-none",
                                    "bg-white text-slate-900 placeholder:text-slate-400",
                                    "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                                    "border-slate-200"
                                )}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        handleChange(
                                            "is_active",
                                            e.target.checked
                                        )
                                    }
                                    className="h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-500"
                                />
                                <label
                                    htmlFor="is_active"
                                    className="cursor-pointer"
                                >
                                    <p className="text-sm font-medium text-slate-900">
                                        Cliente Activo
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Los clientes inactivos no aparecerán en
                                        listas de selección
                                    </p>
                                </label>
                            </div>
                            <Badge
                                variant={
                                    formData.is_active ? "success" : "danger"
                                }
                            >
                                {formData.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate("/clients")}
                        className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 min-w-[140px] transition-all active:scale-95"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-1.5" />
                                {isEditing
                                    ? "Actualizar Cliente"
                                    : "Crear Cliente"}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default ClientForm;
