# Mejoras en Cuentas por Pagar (ProviderStatements)

Se han implementado mejoras significativas en el módulo de Cuentas por Pagar para igualar la funcionalidad con los Estados de Cuenta de Clientes.

## Cambios Realizados

### Backend (Django)

1.  **Modelo `Transfer` y `TransferPayment`**:

    -   Se actualizó `PAYMENT_METHOD_CHOICES` para incluir `'nota_credito'`.
    -   Se aseguró que el cálculo del saldo (`balance`) y el estado (`status`) se actualicen correctamente al registrar pagos o notas de crédito.

2.  **Vistas (`TransferViewSet`)**:
    -   **`register_payment`**: Nuevo endpoint para registrar pagos parciales o totales. Soporta comprobantes (archivos).
    -   **`register_credit_note`**: Nuevo endpoint específico para registrar notas de crédito. Reduce el saldo de la deuda y permite adjuntar el PDF de la nota.
    -   **`detail_with_payments`**: Nuevo endpoint que devuelve el detalle completo de una transferencia, incluyendo el historial de pagos y notas de crédito asociadas.

### Frontend (React)

1.  **Nueva Interfaz de Usuario**:

    -   Se rediseñó `ProviderStatements.jsx` para ser más interactivo.
    -   Se agregaron botones de acción rápida en la tabla de movimientos: "Registrar Pago", "Nota de Crédito", "Ver Detalles".

2.  **Funcionalidad de Pagos**:

    -   Modal para registrar pagos con soporte para:
        -   Monto parcial o total.
        -   Selección de método de pago (Transferencia, Cheque, Efectivo, Tarjeta).
        -   Carga de comprobante de pago.
        -   Referencia y notas.

3.  **Funcionalidad de Notas de Crédito**:

    -   Modal específico para registrar notas de crédito.
    -   Campos para número de nota, motivo y archivo PDF.
    -   Visualización diferenciada en el historial.

4.  **Visualización de Detalles**:
    -   Modal de detalles que muestra:
        -   Información general de la factura/gasto.
        -   Desglose de montos (Total, Pagado, Notas de Crédito, Saldo).
        -   Tabla de historial de pagos con enlaces a comprobantes.
        -   Tabla de notas de crédito aplicadas.

## Instrucciones de Uso

1.  Navegar a "Cuentas por Pagar".
2.  Seleccionar un proveedor de la lista.
3.  En la tabla de movimientos, usar los botones de acción para gestionar cada factura pendiente.
4.  El estado de cuenta y el saldo total se actualizarán automáticamente tras cada operación.
