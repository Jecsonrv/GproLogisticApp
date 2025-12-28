from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

def create_full_manual():
    # --- Paleta Corporativa GPRO ---
    COLOR_PRIMARY = colors.HexColor("#0f172a")    # Slate 900
    COLOR_SECONDARY = colors.HexColor("#1e293b")  # Slate 800
    COLOR_ACCENT = colors.HexColor("#2563eb")     # Blue 600
    COLOR_HEADER_BG = colors.HexColor("#f1f5f9")  # Slate 100
    COLOR_SUCCESS = colors.HexColor("#059669")    # Emerald 600
    COLOR_DANGER = colors.HexColor("#dc2626")     # Red 600

    doc = SimpleDocTemplate(
        "MANUAL_OPERATIVO_GPRO_LOGISTIC.pdf",
        pagesize=LETTER,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # --- Estilos ---
    style_title = ParagraphStyle(
        'Title', parent=styles['Heading1'], fontSize=26, textColor=COLOR_PRIMARY, 
        alignment=TA_CENTER, spaceAfter=10, fontName='Helvetica-Bold'
    )
    style_h1 = ParagraphStyle(
        'H1', parent=styles['Heading2'], fontSize=18, textColor=COLOR_PRIMARY, 
        spaceBefore=20, spaceAfter=12, fontName='Helvetica-Bold',
        borderPadding=(0,0,5,0), borderWidth=0, borderColor=COLOR_PRIMARY
    )
    style_h2 = ParagraphStyle(
        'H2', parent=styles['Heading3'], fontSize=14, textColor=COLOR_ACCENT, 
        spaceBefore=15, spaceAfter=8, fontName='Helvetica-Bold'
    )
    style_body = ParagraphStyle(
        'Body', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#334155"), 
        leading=14, alignment=TA_JUSTIFY, spaceAfter=6
    )
    style_cell = ParagraphStyle(
        'Cell', parent=style_body, fontSize=9, leading=11, spaceAfter=0
    )
    style_cell_header = ParagraphStyle(
        'CellHeader', parent=style_cell, textColor=colors.white, fontName='Helvetica-Bold', alignment=TA_CENTER
    )

    # --- PORTADA ---
    logo_path = "logo/logo.png"
    if os.path.exists(logo_path):
        try:
            im = Image(logo_path, width=3*inch, height=3*inch)
            im.hAlign = 'CENTER'
            story.append(im)
            story.append(Spacer(1, 40))
        except:
            pass

    story.append(Paragraph("MANUAL DE OPERACIONES", style_title))
    story.append(Paragraph("SISTEMA G-PRO LOGISTIC", style_title))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Guía Integral de Usuario, Roles y Procedimientos", 
        ParagraphStyle('Sub', parent=style_body, alignment=TA_CENTER, fontSize=14)))
    story.append(PageBreak())

    # --- 1. INTRODUCCIÓN Y ALCANCE ---
    story.append(Paragraph("1. Introducción y Alcance", style_h1))
    story.append(Paragraph(
        "Este sistema es la herramienta central para la gestión operativa y financiera de la agencia. "
        "Su diseño garantiza la integridad de la información contable y facilita el seguimiento de cada embarque "
        "desde su apertura hasta la facturación final.", style_body
    ))

    # --- 2. ROLES Y PERMISOS ---
    story.append(Paragraph("2. Roles y Permisos del Sistema", style_h1))
    story.append(Paragraph(
        "El sistema utiliza un control de acceso estricto para proteger la información sensible. "
        "A continuación, se detallan las capacidades de cada perfil:", style_body
    ))

    # Tabla de Roles (Usando Paragraphs dentro de celdas para word-wrap)
    roles_data = [
        [Paragraph("ACCIÓN / MÓDULO", style_cell_header), Paragraph("OPERATIVO", style_cell_header), Paragraph("ADMINISTRADOR", style_cell_header)],
        [Paragraph("Crear/Editar Órdenes de Servicio", style_cell), Paragraph("✅ Permitido", style_cell), Paragraph("✅ Permitido", style_cell)],
        [Paragraph("Subir Documentos y Gastos", style_cell), Paragraph("✅ Permitido", style_cell), Paragraph("✅ Permitido", style_cell)],
        [Paragraph("Eliminar Registros Vinculados", style_cell), Paragraph("❌ Bloqueado", style_cell), Paragraph("⚠️ Acceso Restringido", style_cell)],
        [Paragraph("Gestión de Usuarios", style_cell), Paragraph("❌ Bloqueado", style_cell), Paragraph("✅ Control Total", style_cell)],
        [Paragraph("Aprobar Pagos Críticos", style_cell), Paragraph("❌ Bloqueado", style_cell), Paragraph("✅ Requerido", style_cell)],
        [Paragraph("Ver Reportes Financieros", style_cell), Paragraph("✅ Vista Básica", style_cell), Paragraph("✅ Vista Completa", style_cell)],
    ]

    t_roles = Table(roles_data, colWidths=[2.5*inch, 2*inch, 2.5*inch])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('ROWBACKGROUNDS', (1,1), (-1,-1), [colors.white, COLOR_HEADER_BG]),
    ]))
    story.append(t_roles)

    # --- 3. REGLAS DE EDICIÓN Y ELIMINACIÓN ---
    story.append(Paragraph("3. Reglas de Integridad (¿Qué puedo borrar?)", style_h1))
    story.append(Paragraph(
        "Para evitar errores contables, el sistema aplica reglas de validación automática. "
        "No es un error del sistema, es una medida de protección.", style_body
    ))

    rules_data = [
        [Paragraph("ELEMENTO", style_cell_header), Paragraph("CONDICIÓN PARA EDITAR/BORRAR", style_cell_header)],
        [Paragraph("<b>Clientes</b>", style_cell), 
         Paragraph("Solo se pueden eliminar si <b>NO tienen órdenes de servicio activas</b>. Si un cliente tiene historial, el sistema impedirá su borrado para no romper los reportes pasados.", style_cell)],
        [Paragraph("<b>Órdenes de Servicio</b>", style_cell), 
         Paragraph("Se pueden editar libremente mientras estén en estado 'Pendiente' o 'En Tránsito'. <br/><b>Restricción:</b> Una vez facturada, la orden se bloquea para evitar discrepancias fiscales.", style_cell)],
        [Paragraph("<b>Servicios / Cargos</b>", style_cell), 
         Paragraph("No se pueden eliminar cargos que ya han sido incluidos en una factura emitida. Primero debe anular la factura (Nota de Crédito) para liberar los cargos.", style_cell)],
        [Paragraph("<b>Pagos a Proveedores</b>", style_cell), 
         Paragraph("Un pago no puede ser eliminado si ya fue conciliado o si pertenece a un cierre contable aprobado.", style_cell)],
    ]

    t_rules = Table(rules_data, colWidths=[2*inch, 5*inch])
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_rules)

    # --- 4. VALIDACIONES DEL SISTEMA ---
    story.append(PageBreak())
    story.append(Paragraph("4. Validaciones Automáticas", style_h1))
    story.append(Paragraph(
        "El sistema le alertará si intenta realizar una acción que viola la lógica de negocio:", style_body
    ))

    validations = [
        ("Montos Negativos", "No se permiten valores negativos en precios o cantidades. Si necesita restar, utilice Notas de Crédito."),
        ("Duplicidad de Documentos", "El sistema verifica que no se ingrese el mismo número de factura de proveedor dos veces para evitar pagos dobles."),
        ("Fechas Incoherentes", "La fecha de cierre de una orden no puede ser anterior a su fecha de creación."),
        ("Pagos Agrupados", "Al pagar múltiples facturas en lote, el sistema validará que todas pertenezcan al mismo proveedor y moneda.")
    ]

    for title, desc in validations:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", style_body))

    # --- 5. FLUJOS OPERATIVOS ---
    story.append(Paragraph("5. Flujos Operativos Clave", style_h1))

    # A. Ciclo de Venta
    story.append(Paragraph("A. Ciclo de Ingresos (Cobro al Cliente)", style_h2))
    story.append(Paragraph(
        "1. <b>Crear OS:</b> Ingrese los datos del embarque.<br/>"
        "2. <b>Cargar Servicios:</b> En la pestaña 'Calculadora', añada los rubros a cobrar.<br/>"
        "3. <b>Revisar Fiscalidad:</b> Verifique si aplica Retención (1%) o si el servicio es 'No Sujeto' a IVA.<br/>"
        "4. <b>Facturar:</b> Use el asistente de facturación para generar el documento oficial.",
        style_body
    ))

    # B. Ciclo de Compra
    story.append(Paragraph("B. Ciclo de Egresos (Pago a Proveedores)", style_h2))
    story.append(Paragraph(
        "1. <b>Registrar Gasto:</b> Ingrese la factura del proveedor (Transporte, Naviera) en la OS correspondiente.<br/>"
        "2. <b>Adjuntar PDF:</b> Es obligatorio subir el respaldo digital.<br/>"
        "3. <b>Solicitar Pago:</b> El gasto queda en estado 'Pendiente de Pago'.<br/>"
        "4. <b>Ejecutar Pago:</b> Desde el módulo de Tesorería, registre la salida de dinero.",
        style_body
    ))

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "Este manual es una guía viva. Si encuentra un escenario no cubierto aquí, "
        "consulte con el administrador para actualizar los procedimientos.", 
        ParagraphStyle('Footer', parent=style_body, alignment=TA_CENTER, textColor=colors.gray)
    ))

    # Construir PDF
    doc.build(story)
    print("PDF Completo Generado: MANUAL_OPERATIVO_GPRO_LOGISTIC.pdf")

if __name__ == "__main__":
    create_full_manual()
