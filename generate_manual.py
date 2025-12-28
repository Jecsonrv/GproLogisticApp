from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

def create_manual():
    # --- Configuración de Colores (Basados en GPRO App) ---
    COLOR_SLATE_900 = colors.HexColor("#0f172a") # Encabezados oscuros
    COLOR_SLATE_700 = colors.HexColor("#334155") # Texto principal
    COLOR_BLUE_600 = colors.HexColor("#2563eb")  # Acentos / Enlaces
    COLOR_EMERALD_500 = colors.HexColor("#10b981") # Tips / Éxito
    COLOR_RED_500 = colors.HexColor("#ef4444")   # Peligro / Don'ts
    COLOR_BG_GRAY = colors.HexColor("#f8fafc")   # Fondos suaves

    doc = SimpleDocTemplate(
        "MANUAL_DE_USUARIO_GPRO.pdf",
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    story = []
    styles = getSampleStyleSheet()

    # --- Estilos Personalizados ---
    style_title = ParagraphStyle(
        'GproTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=COLOR_SLATE_900,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    style_subtitle = ParagraphStyle(
        'GproSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=COLOR_BLUE_600,
        alignment=TA_CENTER,
        spaceAfter=40
    )

    style_h1 = ParagraphStyle(
        'GproH1',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=COLOR_SLATE_900,
        spaceBefore=20,
        spaceAfter=10,
        borderPadding=(0, 0, 5, 0),
        borderWidth=0,
        borderColor=COLOR_SLATE_900,
        fontName='Helvetica-Bold'
    )

    style_h2 = ParagraphStyle(
        'GproH2',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=COLOR_BLUE_600,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )

    style_normal = ParagraphStyle(
        'GproNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=COLOR_SLATE_700,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    style_tip = ParagraphStyle(
        'GproTip',
        parent=style_normal,
        textColor=colors.white,
        backColor=COLOR_EMERALD_500,
        borderPadding=10,
        borderRadius=5,
        spaceBefore=10,
        spaceAfter=10
    )

    style_warning = ParagraphStyle(
        'GproWarning',
        parent=style_normal,
        textColor=colors.white,
        backColor=COLOR_RED_500,
        borderPadding=10,
        borderRadius=5,
        spaceBefore=10,
        spaceAfter=10
    )

    # --- PORTADA ---
    # Intento de logo (placeholder si no existe)
    logo_path = "logo/logo.png"
    if os.path.exists(logo_path):
        try:
            im = Image(logo_path, width=2*inch, height=2*inch)
            im.hAlign = 'CENTER'
            story.append(im)
            story.append(Spacer(1, 20))
        except:
            pass

    story.append(Paragraph("G-PRO LOGISTIC APP", style_title))
    story.append(Paragraph("Manual de Supervivencia y Uso Diario", style_subtitle))
    story.append(Spacer(1, 40))
    story.append(Paragraph("¡Hola! 👋", style_h1))
    story.append(Paragraph(
        "Bienvenido a tu nueva herramienta de trabajo. Este sistema está diseñado para manejar toda la logística "
        "sin volverte loco con papeles de Excel. Aquí vamos a ver cómo crear órdenes, cobrarle a los clientes "
        "y pagarle a los proveedores sin perder ni un centavo.",
        style_normal
    ))
    story.append(PageBreak())

    # --- CONTENIDO ---

    # CAPÍTULO 1: ROLES
    story.append(Paragraph("1. ¿Quién hace qué? (Roles)", style_h1))
    story.append(Paragraph(
        "El sistema tiene dos tipos de usuarios. No te confundas:",
        style_normal
    ))
    
    roles_data = [
        ["El Jefe (Admin)", "El Operativo (Tú, probablemente)"],
        ["• Tiene acceso a TODO.", "• Puede crear Órdenes de Servicio (OS)."],
        ["• Puede borrar cosas (con cuidado).", "• Puede registrar gastos y subir facturas."],
        ["• Aprueba pagos grandes.", "• Puede ver clientes y proveedores."],
        ["• Configura el sistema.", "• NO puede aprobar sus propios pagos (por seguridad)."]
    ]
    t = Table(roles_data, colWidths=[3.5*inch, 3.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_SLATE_900),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 12),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), COLOR_BG_GRAY),
        ('GRID', (0,0), (-1,-1), 1, colors.white),
        ('ALIGN', (0,1), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t)

    # CAPÍTULO 2: LA ORDEN DE SERVICIO
    story.append(Paragraph("2. El Corazón del Sistema: La OS", style_h1))
    story.append(Paragraph(
        "Todo gira alrededor de la <b>Orden de Servicio (OS)</b>. Es el expediente de cada embarque. "
        "Si no hay OS, no hay dinero.", style_normal
    ))
    
    story.append(Paragraph("El Ciclo de Vida:", style_h2))
    story.append(Paragraph(
        "1. <b>Creación:</b> Llenas los datos básicos (Cliente, BL, Referencia).<br/>"
        "2. <b>En Proceso:</b> Le vas metiendo gastos (transporte, aduana) y cobros.<br/>"
        "3. <b>Documentación:</b> Subes los PDFs importantes ahí mismo.<br/>"
        "4. <b>Facturación:</b> Generas la factura al cliente.<br/>"
        "5. <b>Cierre:</b> Cuando todo está pagado y cobrado, la cierras.",
        style_normal
    ))

    story.append(Paragraph(
        "💡 TIP PRO: Siempre asigna el cliente correcto desde el principio. Cambiarlo después es un dolor de cabeza.",
        style_tip
    ))

    # CAPÍTULO 3: DINERO (Cobrar y Pagar)
    story.append(Paragraph("3. Manejando el Dinero", style_h1))
    
    story.append(Paragraph("A) Cobrarle al Cliente (Ingresos)", style_h2))
    story.append(Paragraph(
        "En la pestaña 'Calculadora' de la OS, agregas los servicios. "
        "El sistema es listo: si el cliente es Gran Contribuyente, calcula la retención solo.",
        style_normal
    ))
    story.append(Paragraph(
        "<b>Ojo con el IVA:</b> Ahora el sistema usa 'Gravado' o 'No Sujeto'. Olvida la palabra 'Exento', "
        "ya no la usamos para evitar líos con hacienda.",
        style_normal
    ))

    story.append(Paragraph("B) Pagarle a Proveedores (Gastos)", style_h2))
    story.append(Paragraph(
        "Aquí registras lo que nos cuesta mover la carga (Transportistas, Navieras, etc.).",
        style_normal
    ))
    story.append(Paragraph(
        "<b>Regla de Oro:</b> Cuando hagas un 'Pago Agrupado' (pagar varias facturas de un solo golpe), "
        "asegúrate de que todas sean del <b>MISMO proveedor</b>. El sistema no te dejará mezclar peras con manzanas.",
        style_normal
    ))

    story.append(PageBreak())

    # CAPÍTULO 4: DOS & DON'TS
    story.append(Paragraph("4. Cosas que SÍ y cosas que NO", style_h1))

    # Tabla de SI
    story.append(Paragraph("✅ LO QUE DEBES HACER", style_h2))
    dos_data = [
        ["Subir PDFs", "Siempre sube el comprobante de pago o factura. Si no hay papel, no pasó."],
        ["Revisar Montos", "El sistema no te deja poner números negativos, pero revisa si son $10 o $100."],
        ["Cerrar OS", "Si ya terminaste, ciérrala. Mantener todo 'abierto' ensucia el Dashboard."]
    ]
    t_dos = Table(dos_data, colWidths=[2*inch, 5*inch])
    t_dos.setStyle(TableStyle([
        ('TEXTCOLOR', (0,0), (0,-1), COLOR_EMERALD_500),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_dos)

    # Tabla de NO
    story.append(Paragraph("❌ LO QUE NO DEBES HACER (Por favor)", style_h2))
    donts_data = [
        ["Borrar Clientes", "Si un cliente tiene órdenes activas, el sistema NO te dejará borrarlo. No lo fuerces."],
        ["Inventar Fechas", "No pongas fechas de pago en el futuro lejano, el reporte se verá raro."],
        ["Compartir Claves", "Tu usuario es tuyo. Si algo se rompe con tu usuario, te echaremos la culpa a ti."]
    ]
    t_donts = Table(donts_data, colWidths=[2*inch, 5*inch])
    t_donts.setStyle(TableStyle([
        ('TEXTCOLOR', (0,0), (0,-1), COLOR_RED_500),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_donts)

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "¡Y eso es todo! El sistema es intuitivo. Si ves un botón rojo, ten cuidado. "
        "Si ves uno verde, todo va bien. ¡Éxito con los embarques!",
        style_normal
    ))

    # Construir PDF
    doc.build(story)
    print("PDF Generado exitosamente: MANUAL_DE_USUARIO_GPRO.pdf")

if __name__ == "__main__":
    create_manual()
