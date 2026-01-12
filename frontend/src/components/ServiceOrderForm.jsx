import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Trash2,
    Truck,
    Building2,
} from "lucide-react";
import {
    Button,
    Input,
    Textarea,
    SelectERP,
    Label,
    ModalFooter,
} from "./ui";
import toast from "react-hot-toast";
import useAuthStore from "../stores/authStore";

const ServiceOrderForm = ({
    initialData,
    isEditing = false,
    clients = [],
    subClients = [],
    shipmentTypes = [],
    providers = [],
    customs = [],
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        client: "",
        sub_client: null,
        shipment_type: "",
        provider: "",
        purchase_order: "",
        bl_reference: "",
        eta: "",
        ducas: [""],
        customs: "",
        notes: "",
        is_manual_os: false,
        order_number: "",
        customs_agent: "",
    });

    // Initialize form data
    useEffect(() => {
        if (initialData) {
            setFormData({
                client: initialData.client || "",
                sub_client: initialData.sub_client || null,
                shipment_type: initialData.shipment_type || "",
                provider: initialData.provider || "",
                purchase_order: initialData.purchase_order || "",
                bl_reference: initialData.bl_reference || "",
                eta: initialData.eta || "",
                ducas: initialData.ducas || (initialData.duca ? initialData.duca.split(",").map(d => d.trim()) : [""]),
                customs: initialData.customs || "",
                notes: initialData.notes || "",
                is_manual_os: false, // Usually false when editing
                order_number: initialData.order_number || "",
                customs_agent: initialData.customs_agent || "",
            });
        } else if (user) {
            setFormData(prev => ({
                ...prev,
                customs_agent: user.id
            }));
        }
    }, [initialData, user]);

    const requestedByName = useMemo(() => {
        if (isEditing && initialData) {
            return initialData.customs_agent_name || "Sin asignar";
        }
        if (user) {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            return fullName || user.username;
        }
        return "";
    }, [isEditing, initialData, user]);

    // Filter subclients based on selected client
    const availableSubClients = useMemo(() => {
        if (!formData.client) return [];
        return subClients.filter((sc) => sc.parent_client === formData.client);
    }, [formData.client, subClients]);

    // Clear subclient when client changes
    useEffect(() => {
        if (formData.sub_client && formData.client) {
            const subClientBelongsToClient = subClients.find(
                (sc) =>
                    sc.id === formData.sub_client &&
                    sc.parent_client === formData.client
            );
            if (!subClientBelongsToClient) {
                setFormData((prev) => ({ ...prev, sub_client: null }));
            }
        }
    }, [formData.client, formData.sub_client, subClients]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Manual OS validation
        if (formData.is_manual_os && !isEditing) {
            const osNumber = formData.order_number?.trim();
            if (!osNumber) {
                toast.error("Debe ingresar un número de OS para las OS manuales");
                return;
            }
            const formatRegex = /^\d{1,4}-\d{4}$/;
            if (!formatRegex.test(osNumber)) {
                toast.error("Formato inválido. Use NNN-YYYY (ejemplo: 75-2023, 075-2023, 1550-2023)");
                return;
            }
        }

        // Prepare data for submission
        const dataToSend = {
            ...formData,
            duca: formData.ducas.filter((d) => d.trim()).join(", "),
        };
        delete dataToSend.ducas;

        if (!formData.is_manual_os) {
            delete dataToSend.order_number;
        }

        onSubmit(dataToSend);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Requested By Field */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <Label className="mb-1.5 block">
                    Solicitado por / Aforador
                </Label>
                <Input
                    value={requestedByName}
                    readOnly
                    className="bg-slate-100 text-slate-700 font-medium"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Se registrará automáticamente como el aforador de la orden.
                </p>
            </div>

            {/* Client Info */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1 bg-blue-50 border border-blue-100 rounded-md">
                        <Building2 className="w-3 h-3 text-blue-600" />
                    </div>
                    Información del Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="col-span-2">
                        <Label className="mb-1.5 block">Cliente</Label>
                        <SelectERP
                            value={formData.client}
                            onChange={(val) =>
                                setFormData({
                                    ...formData,
                                    client: val,
                                    sub_client: null,
                                })
                            }
                            options={clients}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                            required
                        />
                    </div>

                    {/* Subcliente */}
                    {formData.client && availableSubClients.length > 0 && (
                        <div className="col-span-2">
                            <Label className="mb-1.5 block">
                                Subcliente
                                <span className="text-slate-500 text-xs ml-2">
                                    (Opcional)
                                </span>
                            </Label>
                            <SelectERP
                                value={formData.sub_client}
                                onChange={(val) =>
                                    setFormData({
                                        ...formData,
                                        sub_client: val,
                                    })
                                }
                                options={availableSubClients}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                clearable
                                placeholder="Selecciona un subcliente..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* OS Manual Checkbox - Only visible in create mode */}
            {!isEditing && (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="is_manual_os"
                            checked={formData.is_manual_os}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    is_manual_os: e.target.checked,
                                    order_number: e.target.checked ? formData.order_number : "",
                                })
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="is_manual_os"
                                className="block text-sm font-medium text-slate-900 cursor-pointer"
                            >
                                Crear OS Manualmente
                            </label>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Activa esta opción para ingresar manualmente el número de una OS.
                            </p>
                        </div>
                    </div>

                    {/* Campo manual de número OS */}
                    {formData.is_manual_os && (
                        <div className="mt-4">
                            <Label className="mb-1.5 block">
                                Número de OS (Formato: NNN-YYYY)
                            </Label>
                            <Input
                                type="text"
                                placeholder="Ejemplo: 75-2023, 075-2023, 1550-2023"
                                value={formData.order_number}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        order_number: e.target.value,
                                    })
                                }
                                pattern="\d{1,4}-\d{4}"
                                required={formData.is_manual_os}
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-600 mt-1">
                                Formato: NNN-YYYY (1 a 4 dígitos - año de 4 dígitos)
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Shipment Info */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pt-2">
                    <div className="p-1 bg-indigo-50 border border-indigo-100 rounded-md">
                        <Truck className="w-3 h-3 text-indigo-600" />
                    </div>
                    Datos del Embarque
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <Label className="mb-1.5 block">
                            Tipo de Embarque
                        </Label>
                        <SelectERP
                            value={formData.shipment_type}
                            onChange={(val) =>
                                setFormData({
                                    ...formData,
                                    shipment_type: val,
                                })
                            }
                            options={shipmentTypes}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            clearable
                            required
                        />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">
                            Naviera / Aerolínea / Transportista
                        </Label>
                        <SelectERP
                            value={formData.provider}
                            onChange={(val) =>
                                setFormData({
                                    ...formData,
                                    provider: val,
                                })
                            }
                            options={providers}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                        />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Aduana</Label>
                        <SelectERP
                            value={formData.customs}
                            onChange={(val) =>
                                setFormData({
                                    ...formData,
                                    customs: val,
                                })
                            }
                            options={customs}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                            placeholder="Selecciona una aduana..."
                        />
                    </div>
                </div>
            </div>

            <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <Label>DUCA(s)</Label>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        ducas: [...formData.ducas, ""],
                                    })
                                }
                                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Agregar DUCA
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.ducas.map((duca, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <Input
                                        value={duca}
                                        onChange={(e) => {
                                            const newDucas = [...formData.ducas];
                                            newDucas[index] = e.target.value;
                                            setFormData({
                                                ...formData,
                                                ducas: newDucas,
                                            });
                                        }}
                                        placeholder={`DUCA ${index + 1} - Ej: 4-12345`}
                                        className="font-mono uppercase bg-white flex-1"
                                    />
                                    {formData.ducas.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDucas = formData.ducas.filter(
                                                    (_, i) => i !== index
                                                );
                                                setFormData({
                                                    ...formData,
                                                    ducas: newDucas,
                                                });
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Eliminar DUCA"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1.5 block">BL / Guía</Label>
                        <Input
                            value={formData.bl_reference}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    bl_reference: e.target.value,
                                })
                            }
                            placeholder="Ej: MAEU123456789"
                            className="font-mono uppercase bg-white"
                        />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Fecha ETA</Label>
                        <Input
                            type="date"
                            value={formData.eta}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    eta: e.target.value,
                                })
                            }
                            className="bg-white"
                        />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">
                            Orden de Compra (PO)
                        </Label>
                        <Input
                            value={formData.purchase_order}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    purchase_order: e.target.value,
                                })
                            }
                            placeholder="Ej: PO-998877"
                            className="bg-white"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label className="mb-1.5 block">
                            Concepto / Información Adicional
                        </Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Concepto de la orden, observaciones, instrucciones especiales..."
                            rows={3}
                            className="bg-white resize-none"
                        />
                    </div>
                </div>
            </div>

            <ModalFooter className="px-0 pb-0 mr-0">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-slate-500 font-semibold"
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    className="bg-slate-900 text-white hover:bg-black min-w-[140px] shadow-lg shadow-slate-200 transition-all active:scale-95 mr-0"
                    disabled={isLoading}
                >
                    {isLoading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Orden"}
                </Button>
            </ModalFooter>
        </form>
    );
};

export default ServiceOrderForm;
