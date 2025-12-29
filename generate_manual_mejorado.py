from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

def create_manual():
    """
    Genera el Manual de Usuario de GPRO Logistic App
    Versión mejorada con colores profesionales y diseño limpio
    """

    # Paleta de colores profesional - Azul oscuro elegante
    COLOR_PRIMARY = colors.HexColor("#1e293b")      # Azul oscuro para títulos
    COLOR_ACCENT = colors.HexColor("#475569")       # Gris azulado para subtítulos
    COLOR_TEXT = colors.HexColor("#334155")         # Texto normal
    COLOR_TABLE_HEADER = colors.HexColor("#1e3a8a") # Azul oscuro para headers de tabla
    COLOR_TABLE_ALT = colors.HexColor("#f1f5f9")    # Fondo alternado suave
    COLOR_SUCCESS = colors.HexColor("#059669")      # Verde para success
    COLOR_WARNING = colors.HexColor("#d97706")      # Naranja para advertencias
    COLOR_INFO = colors.HexColor("#0284c7")         # Azul para información

    doc = SimpleDocTemplate(
        "MANUAL_USUARIO_GPRO_MEJORADO.pdf",
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    story = []
    styles = getSampleStyleSheet()

    # =========================================
    # ESTILOS PERSONALIZADOS
    # =========================================

    style_title = ParagraphStyle(
        'ManualTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=COLOR_PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    style_subtitle = ParagraphStyle(
        'ManualSubtitle',
        parent=styles['Normal'],
        fontSize=13,
        textColor=COLOR_ACCENT,
        alignment=TA_CENTER,
        spaceAfter=30
    )

    style_h1 = ParagraphStyle(
        'ManualH1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=COLOR_PRIMARY,
        spaceBefore=25,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    style_h2 = ParagraphStyle(
        'ManualH2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=COLOR_ACCENT,
        spaceBefore=18,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )

    style_h3 = ParagraphStyle(
        'ManualH3',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=COLOR_PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )

    style_body = ParagraphStyle(
        'ManualBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=COLOR_TEXT,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    style_tip = ParagraphStyle(
        'ManualTip',
        parent=style_body,
        fontSize=9,
        textColor=COLOR_INFO,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=12,
        borderPadding=10,
        borderWidth=1,
        borderColor=COLOR_INFO,
        backColor=colors.HexColor("#eff6ff")
    )

    style_warning = ParagraphStyle(
        'ManualWarning',
        parent=style_body,
        fontSize=9,
        textColor=COLOR_WARNING,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=12,
        borderPadding=10,
        borderWidth=1,
        borderColor=COLOR_WARNING,
        backColor=colors.HexColor("#fffbeb")
    )

    style_success = ParagraphStyle(
        'ManualSuccess',
        parent=style_body,
        fontSize=9,
        textColor=COLOR_SUCCESS,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=12,
        borderPadding=10,
        borderWidth=1,
        borderColor=COLOR_SUCCESS,
        backColor=colors.HexColor("#f0fdf4")
    )

    style_bullet = ParagraphStyle(
        'ManualBullet',
        parent=style_body,
        fontSize=10,
        leftIndent=20,
        spaceAfter=4
    )

    # =========================================
    # PORTADA
    # =========================================

    story.append(Spacer(1, 60))

    # Intentar añadir logo si existe
    logo_path = "frontend/public/logo.svg"
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=2*inch, height=2*inch)
            logo.hAlign = 'CENTER'
            story.append(logo)
            story.append(Spacer(1, 20))
        except:
            pass  # Si falla, continuar sin logo

    story.append(Paragraph("MANUAL DE USUARIO DEL SISTEMA", style_title))
    story.append(Spacer(1, 10))
    story.append(Paragraph("GPRO Logistic", style_subtitle))
    story.append(Spacer(1, 40))

    intro = """
    Este manual está diseñado para guiarte paso a paso en el uso de todas las funciones del sistema,
    desde la creación de órdenes de servicio hasta la facturación y el seguimiento de pagos.
    <br/><br/>
    Consulta esta guía cada vez que tengas una duda. Encontrarás ejemplos claros y consejos prácticos
    para aprovechar al máximo todas las herramientas disponibles.
    """
    story.append(Paragraph(intro, style_body))
    story.append(PageBreak())

    # =========================================
    # TABLA DE CONTENIDO
    # =========================================

    story.append(Paragraph("Contenido", style_h1))
    story.append(Spacer(1, 15))

    toc_data = [
        ["1.", "Primeros Pasos", "3"],
        ["2.", "Panel de Control", "4"],
        ["3.", "Gestión de Clientes", "5"],
        ["4.", "Órdenes de Servicio", "7"],
        ["5.", "Facturación y Cuentas por Cobrar", "11"],
        ["6.", "Estados de Cuenta de Clientes", "14"],
        ["7.", "Pagos a Proveedores", "15"],
        ["8.", "Estados de Cuenta de Proveedores", "17"],
        ["9.", "Catálogos del Sistema", "18"],
        ["10.", "Gestión de Usuarios", "20"],
        ["11.", "Mi Perfil", "21"],
        ["12.", "Consejos y Buenas Prácticas", "22"],
    ]

    toc_table = Table(toc_data, colWidths=[0.5*inch, 4.5*inch, 0.8*inch])
    toc_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), COLOR_TEXT),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # =========================================
    # CONTENIDO
    # =========================================

    # 1. PRIMEROS PASOS
    story.append(Paragraph("1. Primeros Pasos", style_h1))

    story.append(Paragraph("Acceso al Sistema", style_h2))
    story.append(Paragraph(
        "Para ingresar al sistema, utiliza las credenciales que te proporcionó el administrador. "
        "Ingresa tu usuario y contraseña en la pantalla de inicio de sesión.",
        style_body
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "💡 <b>Consejo:</b> Guarda tu contraseña en un lugar seguro y cámbiala periódicamente "
        "desde el menú 'Mi Perfil'.",
        style_tip
    ))

    story.append(Paragraph("Navegación Principal", style_h2))
    story.append(Paragraph(
        "El menú lateral te permite acceder a todos los módulos del sistema:",
        style_body
    ))

    nav_data = [
        ["Módulo", "Función"],
        ["Dashboard", "Vista general de métricas y estadísticas"],
        ["Clientes", "Gestión de clientes y subclientes"],
        ["Órdenes de Servicio", "Crear y administrar órdenes de importación"],
        ["Facturación", "Generar facturas y notas de crédito"],
        ["Cuentas por Cobrar", "Ver saldos pendientes de clientes"],
        ["Pagos a Proveedores", "Registrar gastos y pagos a proveedores"],
        ["Estados de Cuenta", "Consultar movimientos de clientes y proveedores"],
        ["Catálogos", "Configurar servicios, bancos, y otros datos"],
    ]

    nav_table = Table(nav_data, colWidths=[2*inch, 4*inch])
    nav_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), COLOR_TEXT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_TABLE_ALT]),
    ]))
    story.append(Spacer(1, 10))
    story.append(nav_table)
    story.append(PageBreak())

    # 2. DASHBOARD
    story.append(Paragraph("2. Panel de Control", style_h1))
    story.append(Paragraph(
        "El Dashboard te muestra un resumen visual de la operación del negocio:",
        style_body
    ))

    story.append(Spacer(1, 10))

    dashboard_items = [
        "Órdenes de servicio activas y su estado",
        "Facturas pendientes de cobro",
        "Ingresos del mes actual",
        "Gastos pendientes de pago",
        "Gráficas de tendencias mensuales"
    ]

    for item in dashboard_items:
        story.append(Paragraph(f"• {item}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "ℹ️ <b>Información:</b> El Dashboard se actualiza automáticamente cada vez que realizas "
        "una operación en el sistema.",
        style_tip
    ))
    story.append(PageBreak())

    # 3. GESTIÓN DE CLIENTES
    story.append(Paragraph("3. Gestión de Clientes", style_h1))

    story.append(Paragraph("Crear un Nuevo Cliente", style_h2))
    story.append(Paragraph(
        "Para registrar un cliente en el sistema:",
        style_body
    ))

    client_steps = [
        "Haz clic en el botón '+ Nuevo Cliente'",
        "Completa la información básica: nombre, NIT, dirección",
        "Añade los datos de contacto: teléfono, email",
        "Si el cliente tiene descuento especial, configúralo en el campo correspondiente",
        "Guarda los cambios"
    ]

    for i, step in enumerate(client_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "✅ <b>Buena Práctica:</b> Verifica que el NIT esté correcto antes de guardar. "
        "Este dato es necesario para generar facturas válidas.",
        style_success
    ))

    story.append(Paragraph("Subclientes", style_h2))
    story.append(Paragraph(
        "Los subclientes te permiten organizar diferentes divisiones o sucursales de un mismo cliente principal. "
        "Son útiles cuando un cliente tiene múltiples puntos de facturación o centros de costo.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Por ejemplo, si trabajas con una cadena de restaurantes, el cliente principal sería la empresa "
        "matriz, y cada restaurante sería un subcliente.",
        style_body
    ))

    story.append(Paragraph("Editar o Eliminar Clientes", style_h2))
    story.append(Paragraph(
        "Usa los botones de acción en la tabla de clientes para editar la información o eliminar "
        "registros que ya no sean necesarios.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "⚠️ <b>Advertencia:</b> No puedes eliminar un cliente si tiene órdenes de servicio o facturas asociadas. "
        "En estos casos, el sistema te mostrará un mensaje de error.",
        style_warning
    ))
    story.append(PageBreak())

    # 4. ÓRDENES DE SERVICIO
    story.append(Paragraph("4. Órdenes de Servicio", style_h1))

    story.append(Paragraph(
        "Las órdenes de servicio son el corazón del sistema. Representan cada operación de importación "
        "que gestionas para tus clientes.",
        style_body
    ))

    story.append(Paragraph("Crear una Orden de Servicio", style_h2))

    os_steps = [
        "Haz clic en '+ Nueva Orden'",
        "Selecciona el cliente y subcliente (si aplica)",
        "Elige el tipo de embarque (Marítimo, Aéreo, Terrestre)",
        "Ingresa el número de DUCA y orden de compra",
        "Opcionalmente añade proveedor y agente aduanero",
        "Guarda la orden"
    ]

    for i, step in enumerate(os_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Paragraph("Estados de una Orden", style_h2))

    estados_data = [
        ["Estado", "Descripción"],
        ["Pendiente", "Orden creada, esperando inicio de trámites"],
        ["En Tránsito", "Mercancía en camino"],
        ["En Puerto", "Mercancía llegó al puerto, pendiente de nacionalización"],
        ["En Almacenadora", "Mercancía en bodega fiscal"],
        ["Finalizada", "Trámites completados, lista para facturar"],
        ["Cerrada", "Facturada y cerrada contablemente"],
    ]

    estados_table = Table(estados_data, colWidths=[1.5*inch, 4.5*inch])
    estados_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), COLOR_TEXT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_TABLE_ALT]),
    ]))
    story.append(Spacer(1, 10))
    story.append(estados_table)

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "💡 <b>Consejo:</b> Actualiza el estado de la orden conforme avanza el proceso. "
        "Esto te ayudará a tener un control visual del pipeline de operaciones.",
        style_tip
    ))

    story.append(Paragraph("Agregar Servicios a la Orden", style_h2))
    story.append(Paragraph(
        "Una vez creada la orden, puedes añadir los servicios que vas a cobrar al cliente:",
        style_body
    ))

    story.append(Spacer(1, 8))

    servicios_steps = [
        "Abre el detalle de la orden haciendo clic sobre ella",
        "Ve a la pestaña 'Servicios'",
        "Haz clic en '+ Agregar Servicio'",
        "Selecciona el servicio del catálogo (ej: Transporte, Almacenaje, Honorarios)",
        "Ajusta la cantidad y el precio si es necesario",
        "Indica si el servicio lleva IVA (13%), está exento, o no está sujeto",
        "Guarda el servicio"
    ]

    for i, step in enumerate(servicios_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "✅ <b>Buena Práctica:</b> Revisa que los precios de los servicios sean correctos antes de facturar. "
        "Puedes configurar precios personalizados por cliente en el módulo de Catálogos.",
        style_success
    ))

    story.append(Paragraph("Registrar Gastos de Proveedores", style_h2))
    story.append(Paragraph(
        "Los gastos son costos que pagas a terceros (proveedores) y que puedes reembolsar al cliente:",
        style_body
    ))

    story.append(Spacer(1, 8))

    gastos_steps = [
        "En el detalle de la orden, ve a la pestaña 'Gastos'",
        "Haz clic en '+ Agregar Gasto'",
        "Selecciona el proveedor",
        "Ingresa la descripción y el monto del gasto",
        "Define el margen de ganancia que cobrarás al cliente",
        "Indica el tipo de IVA para el cliente",
        "Guarda el gasto"
    ]

    for i, step in enumerate(gastos_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Por ejemplo: Si pagas $100 de transporte al proveedor y aplicas un margen del 15%, "
        "al cliente se le facturarán $115 por este concepto.",
        style_body
    ))

    story.append(Paragraph("Subir Documentos", style_h2))
    story.append(Paragraph(
        "Puedes adjuntar documentos relacionados con la orden (facturas de proveedor, BL, certificados, etc.) "
        "en la pestaña 'Documentos'. Solo arrastra el archivo o haz clic para seleccionarlo.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Los formatos permitidos son: PDF, Excel, Word e imágenes (JPG, PNG).",
        style_body
    ))
    story.append(PageBreak())

    # 5. FACTURACIÓN
    story.append(Paragraph("5. Facturación y Cuentas por Cobrar", style_h1))

    story.append(Paragraph(
        "El módulo de Facturación te permite generar facturas de venta a partir de las órdenes de servicio.",
        style_body
    ))

    story.append(Paragraph("Generar una Factura", style_h2))

    factura_steps = [
        "Abre el detalle de la orden que quieres facturar",
        "Asegúrate de que la orden esté en estado 'Finalizada'",
        "Haz clic en 'Generar Factura'",
        "Verifica los servicios y gastos que se incluirán",
        "Ajusta cantidades o elimina items si es necesario",
        "Confirma la factura",
        "El sistema generará el número de factura automáticamente"
    ]

    for i, step in enumerate(factura_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "⚠️ <b>Importante:</b> Una vez confirmada la factura, no podrás modificar los montos. "
        "Solo podrás anularla mediante una Nota de Crédito.",
        style_warning
    ))

    story.append(Paragraph("Registrar Pagos de Clientes", style_h2))
    story.append(Paragraph(
        "Cuando un cliente te paga una factura:",
        style_body
    ))

    story.append(Spacer(1, 8))

    pago_steps = [
        "Ve al módulo 'Facturación' o 'Cuentas por Cobrar'",
        "Busca la factura pendiente",
        "Haz clic en 'Registrar Pago'",
        "Ingresa el monto, fecha, método de pago y referencia",
        "Opcionalmente sube el comprobante de pago",
        "Guarda el pago"
    ]

    for i, step in enumerate(pago_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El sistema calculará automáticamente el saldo pendiente. Puedes registrar pagos parciales si el cliente "
        "abona de forma escalonada.",
        style_body
    ))

    story.append(Paragraph("Notas de Crédito", style_h2))
    story.append(Paragraph(
        "Si necesitas anular total o parcialmente una factura (por error, devolución, o descuento), "
        "genera una Nota de Crédito:",
        style_body
    ))

    story.append(Spacer(1, 8))

    nc_steps = [
        "En el detalle de la factura, haz clic en 'Crear Nota de Crédito'",
        "Indica el motivo (error de facturación, descuento, devolución, anulación)",
        "Ingresa el monto a acreditar",
        "Confirma la nota de crédito"
    ]

    for i, step in enumerate(nc_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "La Nota de Crédito reducirá el saldo pendiente de la factura automáticamente.",
        style_body
    ))
    story.append(PageBreak())

    # 6. ESTADOS DE CUENTA DE CLIENTES
    story.append(Paragraph("6. Estados de Cuenta de Clientes", style_h1))

    story.append(Paragraph(
        "En este módulo puedes consultar el historial completo de movimientos de cada cliente: "
        "facturas emitidas, pagos recibidos, notas de crédito aplicadas, y saldo pendiente.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Selecciona el cliente y el año que deseas consultar. El sistema te mostrará un detalle "
        "ordenado cronológicamente de todas las transacciones.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "💡 <b>Consejo:</b> Usa el botón 'Exportar' para generar un archivo Excel del estado de cuenta "
        "y enviarlo al cliente cuando lo solicite.",
        style_tip
    ))
    story.append(PageBreak())

    # 7. PAGOS A PROVEEDORES
    story.append(Paragraph("7. Pagos a Proveedores", style_h1))

    story.append(Paragraph(
        "Este módulo te permite gestionar los gastos que registraste en las órdenes de servicio "
        "y registrar los pagos realizados a los proveedores.",
        style_body
    ))

    story.append(Paragraph("Registrar un Pago Individual", style_h2))

    pago_prov_steps = [
        "Ve al módulo 'Pagos a Proveedores'",
        "Busca el gasto pendiente de pago",
        "Haz clic en 'Registrar Pago'",
        "Ingresa monto, fecha, método de pago, banco y referencia",
        "Sube el comprobante de pago (opcional)",
        "Guarda el pago"
    ]

    for i, step in enumerate(pago_prov_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Paragraph("Pago Agrupado (Batch Payment)", style_h2))
    story.append(Paragraph(
        "Si necesitas pagar varias facturas de un mismo proveedor con un solo desembolso, "
        "usa la función de Pago Agrupado:",
        style_body
    ))

    story.append(Spacer(1, 8))

    batch_steps = [
        "Selecciona las facturas pendientes que deseas pagar (checkbox)",
        "Haz clic en 'Registrar Pago Agrupado'",
        "Ingresa el monto total, método de pago y referencia",
        "El sistema distribuirá el pago entre las facturas seleccionadas usando el método FIFO (First In, First Out)"
    ]

    for i, step in enumerate(batch_steps, 1):
        story.append(Paragraph(f"{i}. {step}", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "✅ <b>Ventaja:</b> Ahorras tiempo al no tener que registrar cada pago individualmente.",
        style_success
    ))

    story.append(Paragraph("Notas de Crédito de Proveedores", style_h2))
    story.append(Paragraph(
        "Cuando un proveedor te emite una Nota de Crédito por devolución o descuento, regístrala en el sistema "
        "para que se aplique automáticamente al saldo pendiente.",
        style_body
    ))
    story.append(PageBreak())

    # 8. ESTADOS DE CUENTA DE PROVEEDORES
    story.append(Paragraph("8. Estados de Cuenta de Proveedores", style_h1))

    story.append(Paragraph(
        "Similar a los estados de cuenta de clientes, aquí puedes revisar el historial completo de movimientos "
        "con cada proveedor: gastos registrados, pagos realizados, notas de crédito recibidas, y saldo pendiente.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Esta información es útil para conciliaciones y para planificar tu flujo de caja.",
        style_body
    ))
    story.append(PageBreak())

    # 9. CATÁLOGOS
    story.append(Paragraph("9. Catálogos del Sistema", style_h1))

    story.append(Paragraph(
        "Los catálogos son las listas maestras que alimentan el sistema. Aquí configuras los datos "
        "base que usarás en las operaciones diarias.",
        style_body
    ))

    story.append(Paragraph("Servicios", style_h2))
    story.append(Paragraph(
        "Define los servicios que ofreces (transporte, almacenaje, honorarios, gestión aduanera, etc.) "
        "con sus precios base y configuración de IVA.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "💡 <b>Consejo:</b> Configura precios personalizados por cliente cuando tengas acuerdos especiales "
        "de tarifas. Esto agilizará el proceso de facturación.",
        style_tip
    ))

    story.append(Paragraph("Bancos", style_h2))
    story.append(Paragraph(
        "Registra las cuentas bancarias que utilizas para recibir y realizar pagos. Esto te ayudará "
        "a llevar un control más preciso de los movimientos.",
        style_body
    ))

    story.append(Paragraph("Proveedores", style_h2))
    story.append(Paragraph(
        "Mantén actualizado el listado de proveedores con los que trabajas (navieras, transportistas, "
        "almacenadoras, agentes aduaneros, etc.).",
        style_body
    ))

    story.append(Paragraph("Tipos de Embarque", style_h2))
    story.append(Paragraph(
        "Define las modalidades de transporte que manejas: Marítimo, Aéreo, Terrestre, u otros.",
        style_body
    ))
    story.append(PageBreak())

    # 10. GESTIÓN DE USUARIOS
    story.append(Paragraph("10. Gestión de Usuarios", style_h1))

    story.append(Paragraph(
        "El administrador del sistema puede crear usuarios y asignarles roles con diferentes niveles de acceso:",
        style_body
    ))

    story.append(Spacer(1, 10))

    roles_data = [
        ["Rol", "Permisos"],
        ["Admin", "Acceso completo a todos los módulos y configuraciones"],
        ["Operativo2", "Gestión de órdenes, facturación, y reportes"],
        ["Operativo", "Gestión de órdenes asignadas, consultas"],
        ["Viewer", "Solo lectura, sin capacidad de editar"],
    ]

    roles_table = Table(roles_data, colWidths=[1.5*inch, 4.5*inch])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), COLOR_TEXT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_TABLE_ALT]),
    ]))
    story.append(roles_table)

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "⚠️ <b>Seguridad:</b> Asigna roles de forma prudente. Solo los usuarios de confianza deben tener "
        "acceso de administrador.",
        style_warning
    ))
    story.append(PageBreak())

    # 11. MI PERFIL
    story.append(Paragraph("11. Mi Perfil", style_h1))

    story.append(Paragraph(
        "En la sección 'Mi Perfil' puedes actualizar tu información personal y cambiar tu contraseña.",
        style_body
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Es recomendable cambiar tu contraseña cada cierto tiempo y usar una contraseña segura "
        "(combina letras, números y símbolos).",
        style_body
    ))
    story.append(PageBreak())

    # 12. CONSEJOS Y BUENAS PRÁCTICAS
    story.append(Paragraph("12. Consejos y Buenas Prácticas", style_h1))

    consejos = [
        ("Mantén la información actualizada",
         "Revisa periódicamente que los catálogos de clientes, proveedores y servicios estén al día."),

        ("Documenta todo",
         "Sube los documentos relevantes a cada orden. Te ahorrará tiempo cuando necesites revisar información histórica."),

        ("Actualiza los estados de las órdenes",
         "Un pipeline visual actualizado te ayudará a priorizar tareas y dar seguimiento efectivo a los clientes."),

        ("Revisa antes de facturar",
         "Verifica que todos los servicios y gastos estén correctos antes de confirmar una factura. "
         "Anular con notas de crédito es posible pero menos eficiente."),

        ("Usa los filtros y búsquedas",
         "Aprovecha las herramientas de búsqueda y filtrado para encontrar rápidamente las órdenes o facturas que necesitas."),

        ("Exporta reportes regularmente",
         "Genera reportes en Excel para análisis externo o para compartir con tu equipo contable."),

        ("Cuida la seguridad",
         "No compartas tu contraseña y cierra sesión al terminar de trabajar, especialmente en computadoras compartidas."),
    ]

    for titulo, descripcion in consejos:
        story.append(Paragraph(f"<b>{titulo}</b>", style_h3))
        story.append(Paragraph(descripcion, style_body))
        story.append(Spacer(1, 8))

    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "✅ Si sigues estas prácticas, maximizarás la eficiencia y precisión de tu gestión logística.",
        style_success
    ))

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "─────────────────────────────────────────────",
        ParagraphStyle('divider', alignment=TA_CENTER, textColor=COLOR_ACCENT)
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "<b>¿Necesitas ayuda?</b><br/>"
        "Contacta al administrador del sistema o consulta este manual cada vez que tengas dudas.",
        ParagraphStyle('footer', alignment=TA_CENTER, fontSize=10, textColor=COLOR_TEXT)
    ))

    # =========================================
    # GENERAR PDF
    # =========================================

    doc.build(story)
    print("Manual generado exitosamente: MANUAL_USUARIO_GPRO_MEJORADO.pdf")

if __name__ == "__main__":
    create_manual()
