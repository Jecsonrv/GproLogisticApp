from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

def create_manual():
    # --- Paleta de Colores Corporativa ---
    COLOR_PRIMARY = colors.HexColor("#0f172a")    # Slate 900 (Encabezados)
    COLOR_ACCENT = colors.HexColor("#3b82f6")     # Blue 500 (Subtítulos)
    COLOR_TEXT = colors.HexColor("#334155")       # Slate 700 (Cuerpo)
    COLOR_BG_LIGHT = colors.HexColor("#f1f5f9")   # Slate 100 (Cajas)
    COLOR_SUCCESS = colors.HexColor("#059669")    # Emerald 600
    COLOR_WARNING = colors.HexColor("#ea580c")    # Orange 600

    doc = SimpleDocTemplate(
        "MANUAL_DE_USUARIO_GPRO_LOGISTIC.pdf",
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    story = []
    styles = getSampleStyleSheet()

    # --- Estilos Tipográficos ---
    style_title = ParagraphStyle(
        'ManualTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=COLOR_PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    style_subtitle = ParagraphStyle(
        'ManualSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=COLOR_TEXT,
        alignment=TA_CENTER,
        spaceAfter=30
    )

    style_h1 = ParagraphStyle(
        'ManualH1',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=COLOR_PRIMARY,
        spaceBefore=20,
        spaceAfter=10,
        borderPadding=(0, 0, 8, 0),
        borderWidth=0,
        borderColor=COLOR_PRIMARY,
        fontName='Helvetica-Bold'
    )

    style_h2 = ParagraphStyle(
        'ManualH2',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=COLOR_ACCENT,
        spaceBefore=12,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )

    style_body = ParagraphStyle(
        'ManualBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=COLOR_TEXT,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    style_box = ParagraphStyle(
        'ManualBox',
        parent=style_body,
        backColor=COLOR_BG_LIGHT,
        borderPadding=10,
        borderRadius=4,
        spaceBefore=5,
        spaceAfter=15
    )

    # --- PORTADA ---
    # Intento de logo
    logo_path = "logo/logo.png"
    if os.path.exists(logo_path):
        try:
            im = Image(logo_path, width=2.5*inch, height=2.5*inch)
            im.hAlign = 'CENTER'
            story.append(im)
            story.append(Spacer(1, 30))
        except:
            pass

    story.append(Paragraph("G-PRO LOGISTIC APP", style_title))
    story.append(Paragraph("Manual de Usuario y Operaciones", style_subtitle))
    story.append(Spacer(1, 20))
    
    intro_text = """
    Este documento sirve como guía esencial para el uso del sistema de gestión logística. 
    Aquí encontrará los procedimientos estándar para manejar órdenes de servicio, facturación 
    y pagos a proveedores de manera eficiente y ordenada.
    """
    story.append(Paragraph(intro_text, style_body))
    story.append(PageBreak())

    # --- CONTENIDO ---

    # 1. VISIÓN GENERAL
    story.append(Paragraph("1. Visión General del Sistema", style_h1))
    story.append(Paragraph(
        "El sistema está diseñado para centralizar toda la operación logística en un solo lugar. "
        "Su objetivo principal es mantener el orden financiero y operativo de cada embarque.", 
        style_body
    ))
    
    # Tabla de Roles
    story.append(Paragraph("Roles y Permisos", style_h2))
    roles_data = [
        ["Rol", "Responsabilidades Principales"],
        ["Administrador", "Control total del sistema. Gestión de usuarios, eliminación de registros sensibles y aprobación de pagos críticos."],
        ["Operativo", "Gestión diaria. Creación de órdenes, registro de gastos, carga de documentos y facturación a clientes."]
    ]
    
    t_roles = Table(roles_data, colWidths=[1.5*inch, 5*inch])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_roles)

    # 2. GESTIÓN DE ÓRDENES
    story.append(Paragraph("2. Gestión de Órdenes de Servicio (OS)", style_h1))
    story.append(Paragraph(
        "La Orden de Servicio es el expediente digital de cada operación. Todo ingreso o gasto debe estar vinculado a una OS.",
        style_body
    ))

    steps_os = [
        "1. Inicie una nueva OS seleccionando el Cliente y el tipo de embarque.",
        "2. Complete los datos de referencia (BL, Contenedor, Poliza).",
        "3. El estado inicial será 'Pendiente'. A medida que avance la operación, actualice el estado a 'En Tránsito', 'En Puerto', etc.",
        "4. Importante: No olvide subir los documentos de respaldo (BL, Factura Comercial) en la pestaña 'Documentos'."
    ]
    
    for step in steps_os:
        story.append(Paragraph(step, style_box))

    # 3. MÓDULO FINANCIERO
    story.append(Paragraph("3. Módulo Financiero", style_h1))
    
    story.append(Paragraph("Facturación a Clientes", style_h2))
    story.append(Paragraph(
        "Para cobrar al cliente, diríjase a la pestaña 'Calculadora' dentro de la OS. "
        "Agregue los servicios prestados. El sistema calculará automáticamente el IVA.",
        style_body
    ))
    story.append(Paragraph(
        "Nota Fiscal: El sistema distingue entre conceptos 'Gravados' (13% IVA) y 'No Sujetos'. "
        "Asegúrese de seleccionar el correcto según la naturaleza del servicio.",
        style_body
    ))

    story.append(Paragraph("Pagos a Proveedores", style_h2))
    story.append(Paragraph(
        "Registre aquí las facturas de transporte, navieras y almacenaje. "
        "Es vital adjuntar el comprobante o factura del proveedor para mantener la auditoría interna.",
        style_body
    ))

    # 4. BUENAS PRÁCTICAS
    story.append(PageBreak())
    story.append(Paragraph("4. Buenas Prácticas y Seguridad", style_h1))

    bp_data = [
        ["Integridad de Datos", "Evite borrar clientes o proveedores que ya tienen historial. El sistema protegerá estos datos para evitar errores contables."],
        ["Orden en Pagos", "Al realizar 'Pagos Agrupados', verifique que todas las facturas seleccionadas pertenezcan al mismo proveedor."],
        ["Cierre de Operaciones", "Cuando una operación concluya administrativa y financieramente, cambie el estado de la OS a 'Finalizada' para mantener limpio el panel de control."]
    ]

    t_bp = Table(bp_data, colWidths=[1.5*inch, 5*inch])
    t_bp.setStyle(TableStyle([
        ('TEXTCOLOR', (0,0), (0,-1), COLOR_PRIMARY),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_bp)

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "Este sistema ha sido desarrollado para facilitar su trabajo diario. "
        "Ante cualquier duda técnica o error inesperado, contacte al administrador del sistema.",
        style_body
    ))

    # Construir PDF
    doc.build(story)
    print("PDF Profesional Generado: MANUAL_DE_USUARIO_GPRO_LOGISTIC.pdf")

if __name__ == "__main__":
    create_manual()
