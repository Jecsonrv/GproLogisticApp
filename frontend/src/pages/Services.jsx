import React, { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DataTable, Modal, Button, Card, Input, Badge } from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Página de Gestión de Servicios
 */
const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        default_price: "",
        applies_iva: true,
        is_active: true,
    });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/catalogs/services/");
            setServices(response.data);
        } catch (error) {
            toast.error("Error al cargar servicios");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (service = null) => {
        if (service) {
            setEditingService(service);
            setFormData(service);
        } else {
            setEditingService(null);
            setFormData({
                code: "",
                name: "",
                description: "",
                default_price: "",
                applies_iva: true,
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingService) {
                await axios.put(
                    `/catalogs/services/${editingService.id}/`,
                    formData
                );
                toast.success("Servicio actualizado exitosamente");
            } else {
                await axios.post("/catalogs/services/", formData);
                toast.success("Servicio creado exitosamente");
            }
            fetchServices();
            handleCloseModal();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error al guardar servicio"
            );
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Está seguro de eliminar este servicio?")) return;

        try {
            await axios.delete(`/catalogs/services/${id}/`);
            toast.success("Servicio eliminado");
            fetchServices();
        } catch (error) {
            toast.error("Error al eliminar servicio");
        }
    };

    const columns = [
        {
            header: "Código",
            accessor: "code",
            render: (row) => (
                <span className="font-mono font-medium text-gray-900">
                    {row.code}
                </span>
            ),
        },
        {
            header: "Nombre",
            accessor: "name",
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Precio Base",
            accessor: "default_price",
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">
                        ${parseFloat(row.default_price).toFixed(2)}
                    </div>
                    {row.applies_iva && (
                        <div className="text-sm text-gray-500">
                            c/IVA: ${parseFloat(row.price_with_iva).toFixed(2)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "IVA",
            accessor: "applies_iva",
            sortable: false,
            render: (row) => (
                <Badge variant={row.applies_iva ? "success" : "default"}>
                    {row.applies_iva ? "Sí (13%)" : "No"}
                </Badge>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            sortable: false,
            render: (row) => (
                <Badge variant={row.is_active ? "success" : "danger"}>
                    {row.is_active ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(row);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Editar"
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Catálogo de Servicios
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Gestiona los servicios disponibles
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => handleOpenModal()}
                    icon={<PlusIcon className="h-5 w-5" />}
                >
                    Agregar Servicio
                </Button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <DataTable
                    data={services}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Buscar servicios..."
                    emptyMessage="No hay servicios registrados"
                />
            </div>

            {/* Modal Crear/Editar */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingService ? "Editar Servicio" : "Nuevo Servicio"}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {editingService ? "Actualizar" : "Crear"}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Código"
                            value={formData.code}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    code: e.target.value.toUpperCase(),
                                })
                            }
                            placeholder="Ej: ASADMON"
                            required
                        />
                        <Input
                            label="Precio Base (Sin IVA)"
                            type="number"
                            step="0.01"
                            value={formData.default_price}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    default_price: e.target.value,
                                })
                            }
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <Input
                        label="Nombre del Servicio"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Ej: Asesoría y Gestión Aduanal"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description: e.target.value,
                                })
                            }
                            rows={3}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Descripción opcional del servicio..."
                        />
                    </div>

                    <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.applies_iva}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        applies_iva: e.target.checked,
                                    })
                                }
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Aplica IVA (13%)
                            </span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        is_active: e.target.checked,
                                    })
                                }
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Activo
                            </span>
                        </label>
                    </div>

                    {formData.applies_iva && formData.default_price && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm text-gray-600">
                                Precio con IVA (13%):
                            </div>
                            <div className="text-2xl font-bold text-primary-600 mt-1">
                                $
                                {(
                                    parseFloat(formData.default_price) * 1.13
                                ).toFixed(2)}
                            </div>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default Services;
