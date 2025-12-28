from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

def create_manual():
    """
    Genera el Manual de Usuario de GPRO Logistic App
    Tono profesional pero accesible, sin tecnicismos innecesarios
    """

    # Paleta de colores corporativa
    COLOR_PRIMARY = colors.HexColor("#0f172a")    # Títulos principales
    COLOR_ACCENT = colors.HexColor("#3b82f6")     # Subtítulos
    COLOR_TEXT = colors.HexColor("#334155")       # Texto normal
    COLOR_BG_LIGHT = colors.HexColor("#f1f5f9")   # Fondos claros
    COLOR_SUCCESS = colors.HexColor("#059669")    # Verde éxito
    COLOR_WARNING = colors.HexColor("#d97706")    # Amarillo advertencia
    COLOR_TIP = colors.HexColor("#0891b2")        # Cyan para tips

    doc = SimpleDocTemplate(
        "MANUAL_USUARIO_GPRO_LOGISTIC.pdf",
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
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )

    style_subtitle = ParagraphStyle(
        'ManualSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=COLOR_TEXT,
        alignment=TA_CENTER,
        spaceAfter=40
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
        textColor=COLOR_TIP,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=12,
        borderPadding=8,
        borderWidth=1,
        borderColor=COLOR_TIP,
        backColor=colors.HexColor("#ecfeff")
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
        borderPadding=8,
        borderWidth=1,
        borderColor=COLOR_WARNING,
        backColor=colors.HexColor("#fffbeb")
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

    story.append(Spacer(1, 80))
    story.append(Paragraph("GPRO LOGISTIC", style_title))
    story.append(Paragraph("Manual de Usuario", style_subtitle))
    story.append(Spacer(1, 40))

    intro = """
    Bienvenido al sistema de gestión logística GPRO. Este manual está diseñado para
    guiarte paso a paso en el uso de todas las funciones del sistema, desde la creación
    de órdenes de servicio hasta la facturación y el seguimiento de pagos.
    <br/><br/>
    No necesitas ser experto en tecnología para usar este sistema. Hemos preparado esta
    guía pensando en que puedas consultarla cada vez que tengas una duda, con ejemplos
    claros y consejos prácticos.
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
        ["2.", "Panel de Control (Dashboard)", "4"],
        ["3.", "Gestión de Clientes", "5"],
        ["4.", "Órdenes de Servicio", "7"],
        ["5.", "Facturación y Cuentas por Cobrar", "11"],
        ["6.", "Estados de Cuenta de Clientes", "14"],
        ["7.", "Pagos a Proveedores", "15"],
        ["8.", "Estados de Cuenta de Proveedores", "17"],
        ["9.", "Catálogos del Sistema", "18"],
        ["10.", "Configuración de Servicios", "19"],
        ["11.", "Gestión de Usuarios", "20"],
        ["12.", "Mi Perfil", "21"],
        ["13.", "Consejos y Buenas Prácticas", "22"],
    ]

    toc_table = Table(toc_data, colWidths=[0.4*inch, 4.5*inch, 0.6*inch])
    toc_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (-1, -1), COLOR_TEXT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # =========================================
    # 1. PRIMEROS PASOS
    # =========================================

    story.append(Paragraph("1. Primeros Pasos", style_h1))

    story.append(Paragraph("Acceder al Sistema", style_h2))
    story.append(Paragraph(
        "Para entrar al sistema, abre tu navegador web (Chrome, Firefox o Edge funcionan bien) "
        "y escribe la dirección que te proporcionó tu administrador. Verás una pantalla de inicio "
        "de sesión donde debes ingresar:",
        style_body
    ))

    story.append(Paragraph("• <b>Usuario:</b> El nombre de usuario que te asignaron", style_bullet))
    story.append(Paragraph("• <b>Contraseña:</b> Tu contraseña personal", style_bullet))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Consejo:</b> Si olvidaste tu contraseña, contacta al administrador del sistema. "
        "Por seguridad, no compartas tus credenciales con nadie.",
        style_tip
    ))

    story.append(Paragraph("Tipos de Usuario", style_h2))
    story.append(Paragraph(
        "El sistema tiene dos tipos de usuarios, cada uno con diferentes permisos:",
        style_body
    ))

    roles_data = [
        ["Rol", "¿Qué puede hacer?"],
        ["Administrador", "Tiene acceso completo: puede crear usuarios, eliminar registros, "
                         "ver reportes financieros y configurar el sistema."],
        ["Operativo", "Maneja el día a día: crea órdenes de servicio, registra gastos, "
                     "sube documentos y genera facturas."]
    ]

    t_roles = Table(roles_data, colWidths=[1.3*inch, 5*inch])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_roles)
    story.append(PageBreak())

    # =========================================
    # 2. DASHBOARD
    # =========================================

    story.append(Paragraph("2. Panel de Control (Dashboard)", style_h1))

    story.append(Paragraph(
        "Al iniciar sesión, lo primero que verás es el Panel de Control. Piensa en él como "
        "el tablero de tu vehículo: te muestra de un vistazo cómo va todo.",
        style_body
    ))

    story.append(Paragraph("¿Qué información encuentras aquí?", style_h2))

    story.append(Paragraph("• <b>Clientes activos:</b> Cuántos clientes tienes registrados", style_bullet))
    story.append(Paragraph("• <b>Órdenes abiertas:</b> Operaciones que están en proceso", style_bullet))
    story.append(Paragraph("• <b>Facturación del mes:</b> Lo que has facturado este mes", style_bullet))
    story.append(Paragraph("• <b>Facturas pendientes:</b> Dinero que aún te deben los clientes", style_bullet))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "También verás gráficas que muestran la evolución de tu negocio: órdenes por mes, "
        "ingresos vs gastos, y el estado de tus operaciones.",
        style_body
    ))

    story.append(Paragraph("Órdenes Recientes y Alertas", style_h2))
    story.append(Paragraph(
        "En la parte inferior encontrarás las últimas órdenes creadas y las alertas importantes, "
        "como facturas vencidas o clientes que han superado su límite de crédito. "
        "Es buena idea revisar estas alertas al comenzar tu jornada.",
        style_body
    ))

    story.append(Paragraph(
        "<b>Consejo:</b> Puedes filtrar los datos del dashboard por mes y año usando los "
        "selectores en la parte superior. Útil para comparar diferentes períodos.",
        style_tip
    ))
    story.append(PageBreak())

    # =========================================
    # 3. GESTIÓN DE CLIENTES
    # =========================================

    story.append(Paragraph("3. Gestión de Clientes", style_h1))

    story.append(Paragraph(
        "Antes de crear cualquier operación, necesitas tener registrados a tus clientes. "
        "Esta sección te permite mantener toda la información de tus clientes organizada.",
        style_body
    ))

    story.append(Paragraph("Crear un Nuevo Cliente", style_h2))
    story.append(Paragraph("Para agregar un cliente:", style_body))
    story.append(Paragraph("1. Ve al menú <b>Clientes</b>", style_bullet))
    story.append(Paragraph("2. Haz clic en el botón <b>Nuevo Cliente</b>", style_bullet))
    story.append(Paragraph("3. Completa la información básica:", style_bullet))
    story.append(Spacer(1, 5))

    client_fields = [
        ["Campo", "Descripción", "¿Obligatorio?"],
        ["Nombre", "Nombre o razón social del cliente", "Sí"],
        ["NIT", "Número de identificación tributaria", "Sí"],
        ["NRC", "Número de registro de contribuyente", "No"],
        ["Teléfono", "Número de contacto principal", "No"],
        ["Correo", "Email para envío de facturas", "No"],
        ["Dirección", "Dirección fiscal", "No"],
    ]

    t_client = Table(client_fields, colWidths=[1.2*inch, 3.3*inch, 1*inch])
    t_client.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_client)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Configuración de Crédito", style_h2))
    story.append(Paragraph(
        "Cada cliente puede tener condiciones de pago diferentes. En la sección de crédito puedes definir:",
        style_body
    ))
    story.append(Paragraph("• <b>Condición de pago:</b> Contado o Crédito", style_bullet))
    story.append(Paragraph("• <b>Días de crédito:</b> Plazo para pagar (ej: 30 días)", style_bullet))
    story.append(Paragraph("• <b>Límite de crédito:</b> Monto máximo que puede deber", style_bullet))
    story.append(Paragraph("• <b>Gran Contribuyente:</b> Marca esta opción si el cliente es Gran Contribuyente (aplica retención del 1%)", style_bullet))

    story.append(Paragraph(
        "<b>Importante:</b> Si un cliente supera su límite de crédito, el sistema te lo notificará "
        "pero aún podrás crear operaciones. Es una alerta, no un bloqueo.",
        style_warning
    ))

    story.append(Paragraph("Desactivar un Cliente", style_h2))
    story.append(Paragraph(
        "Si ya no trabajas con un cliente, puedes desactivarlo en lugar de eliminarlo. "
        "Esto mantiene el historial intacto pero evita que aparezca en los formularios de nueva orden. "
        "Solo puedes desactivar clientes que no tengan órdenes abiertas.",
        style_body
    ))
    story.append(PageBreak())

    # =========================================
    # 4. ÓRDENES DE SERVICIO
    # =========================================

    story.append(Paragraph("4. Órdenes de Servicio", style_h1))

    story.append(Paragraph(
        "La Orden de Servicio (OS) es el corazón del sistema. Es el expediente digital de cada "
        "operación logística que realizas. Todo lo relacionado con un embarque se registra aquí: "
        "documentos, gastos, servicios y facturación.",
        style_body
    ))

    story.append(Paragraph("Crear una Nueva Orden", style_h2))
    story.append(Paragraph("1. Ve al menú <b>Órdenes de Servicio</b>", style_bullet))
    story.append(Paragraph("2. Haz clic en <b>Nueva Orden</b>", style_bullet))
    story.append(Paragraph("3. Selecciona el <b>Cliente</b> (solo aparecen clientes activos)", style_bullet))
    story.append(Paragraph("4. Elige el <b>Tipo de Embarque</b> (Importación, Exportación, etc.)", style_bullet))
    story.append(Paragraph("5. Completa los datos de referencia según tengas disponible", style_bullet))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Datos de Referencia", style_h3))
    story.append(Paragraph(
        "Estos campos te ayudan a identificar y rastrear el embarque:",
        style_body
    ))
    story.append(Paragraph("• <b>BL/AWB:</b> Número de conocimiento de embarque o guía aérea", style_bullet))
    story.append(Paragraph("• <b>Contenedor:</b> Número del contenedor", style_bullet))
    story.append(Paragraph("• <b>Póliza:</b> Número de póliza de importación", style_bullet))
    story.append(Paragraph("• <b>DUCA:</b> Declaración Única Centroamericana", style_bullet))
    story.append(Paragraph("• <b>Orden de Compra:</b> PO del cliente", style_bullet))
    story.append(Paragraph("• <b>ETA:</b> Fecha estimada de llegada", style_bullet))

    story.append(Paragraph("Estados de una Orden", style_h2))

    status_data = [
        ["Estado", "Significado"],
        ["Pendiente", "Recién creada, aún no inicia el proceso"],
        ["En Tránsito", "La mercadería viene en camino"],
        ["En Puerto", "Llegó al puerto, pendiente de desaduanaje"],
        ["En Almacenadora", "Está en almacén fiscal"],
        ["Finalizada", "Operación completada, entregada al cliente"],
        ["Cerrada", "Cerrada administrativamente (no permite más cambios)"],
    ]

    t_status = Table(status_data, colWidths=[1.5*inch, 4.8*inch])
    t_status.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_status)
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<b>Importante:</b> Una vez que cierras una orden, no podrás agregar más gastos ni servicios. "
        "Asegúrate de que todo esté completo antes de cerrarla.",
        style_warning
    ))
    story.append(PageBreak())

    # Detalle de la Orden
    story.append(Paragraph("Dentro de la Orden de Servicio", style_h2))
    story.append(Paragraph(
        "Al abrir una orden, verás varias pestañas con toda la información organizada:",
        style_body
    ))

    story.append(Paragraph("Pestaña: Información General", style_h3))
    story.append(Paragraph(
        "Aquí ves el resumen de la orden y puedes cambiar el estado. También aparece un resumen "
        "financiero: total de servicios, total de gastos y el gran total.",
        style_body
    ))

    story.append(Paragraph("Pestaña: Servicios (Calculadora)", style_h3))
    story.append(Paragraph(
        "Aquí agregas los servicios que cobrarás al cliente. Por ejemplo: servicio de desaduanaje, "
        "flete interno, maniobras, etc.",
        style_body
    ))
    story.append(Paragraph("• Selecciona el servicio del catálogo", style_bullet))
    story.append(Paragraph("• Define la cantidad y el precio unitario", style_bullet))
    story.append(Paragraph("• Indica si aplica IVA (Gravado) o no (No Sujeto)", style_bullet))
    story.append(Paragraph("• El sistema calcula automáticamente subtotal e IVA", style_bullet))

    story.append(Paragraph(
        "<b>Consejo:</b> Si tienes precios especiales para un cliente, puedes configurarlos en "
        "Servicios > Precios por Cliente. Así el sistema sugerirá automáticamente el precio correcto.",
        style_tip
    ))

    story.append(Paragraph("Pestaña: Gastos a Terceros", style_h3))
    story.append(Paragraph(
        "Aquí aparecen los gastos que ya registraste en Pagos a Proveedores y que están marcados "
        "como 'Cargo a Cliente'. Estos son gastos que pagas tú pero que luego cobras al cliente "
        "(fletes, almacenaje, impuestos, etc.).",
        style_body
    ))

    story.append(Paragraph("Pestaña: Calculadora de Reembolsables", style_h3))
    story.append(Paragraph(
        "Para cada gasto a terceros, puedes configurar cuánto cobrarás al cliente:",
        style_body
    ))
    story.append(Paragraph("• <b>Monto base:</b> Lo que pagaste (no editable)", style_bullet))
    story.append(Paragraph("• <b>Margen:</b> Porcentaje de ganancia que agregas", style_bullet))
    story.append(Paragraph("• <b>Tipo de IVA:</b> Si cobra IVA o no", style_bullet))
    story.append(Paragraph("El sistema calcula el total a cobrar automáticamente.", style_body))

    story.append(Paragraph("Pestaña: Documentos", style_h3))
    story.append(Paragraph(
        "Sube aquí todos los documentos relacionados con la operación: BL, factura comercial, "
        "póliza, DUCA, comprobantes de pago, etc. Puedes subir PDFs, imágenes y otros archivos.",
        style_body
    ))

    story.append(Paragraph("Pestaña: Historial", style_h3))
    story.append(Paragraph(
        "Registro automático de todos los cambios: quién modificó qué y cuándo. Útil para "
        "auditoría y seguimiento.",
        style_body
    ))
    story.append(PageBreak())

    # Generar factura desde OS
    story.append(Paragraph("Generar Factura desde la Orden", style_h2))
    story.append(Paragraph(
        "Cuando ya tienes los servicios y gastos registrados, puedes generar la factura directamente:",
        style_body
    ))
    story.append(Paragraph("1. Haz clic en el botón <b>Generar Factura</b>", style_bullet))
    story.append(Paragraph("2. Revisa el desglose de servicios y gastos", style_bullet))
    story.append(Paragraph("3. Confirma los montos y el tipo de factura (DTE, Exportación, etc.)", style_bullet))
    story.append(Paragraph("4. El sistema crea una pre-factura que puedes editar antes de emitir el DTE", style_bullet))

    story.append(Paragraph(
        "<b>Nota:</b> La factura generada es una 'pre-factura'. Puedes editarla, agregar o quitar "
        "items hasta que marques que el DTE fue emitido. Después ya no se puede modificar.",
        style_tip
    ))
    story.append(PageBreak())

    # =========================================
    # 5. FACTURACIÓN Y CXC
    # =========================================

    story.append(Paragraph("5. Facturación y Cuentas por Cobrar (CXC)", style_h1))

    story.append(Paragraph(
        "Este módulo centraliza todas tus facturas emitidas a clientes. Desde aquí puedes "
        "ver el estado de cada factura, registrar pagos y dar seguimiento a las cuentas por cobrar.",
        style_body
    ))

    story.append(Paragraph("Vista General", style_h2))
    story.append(Paragraph(
        "Al entrar verás indicadores clave en la parte superior:",
        style_body
    ))
    story.append(Paragraph("• <b>Total Facturado:</b> Suma de todas tus facturas", style_bullet))
    story.append(Paragraph("• <b>Por Cobrar:</b> Lo que aún te deben", style_bullet))
    story.append(Paragraph("• <b>Cobrado:</b> Lo que ya recibiste", style_bullet))
    story.append(Paragraph("• <b>Vencido:</b> Facturas que ya pasaron su fecha de vencimiento", style_bullet))

    story.append(Paragraph("Estados de Factura", style_h2))

    inv_status = [
        ["Estado", "Significado"],
        ["Pendiente", "No ha recibido ningún pago"],
        ["Parcial", "Ha recibido pagos pero aún tiene saldo"],
        ["Pagada", "Completamente pagada"],
        ["Vencida", "Pasó la fecha de vencimiento y tiene saldo"],
        ["Anulada", "Fue cancelada (no cuenta en totales)"],
    ]

    t_inv = Table(inv_status, colWidths=[1.3*inch, 5*inch])
    t_inv.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_inv)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Registrar un Pago", style_h2))
    story.append(Paragraph(
        "Cuando un cliente te paga:",
        style_body
    ))
    story.append(Paragraph("1. Busca la factura en el listado", style_bullet))
    story.append(Paragraph("2. Haz clic en el ícono de <b>Registrar Pago</b> (billete)", style_bullet))
    story.append(Paragraph("3. Completa los datos:", style_bullet))
    story.append(Paragraph("   • Monto recibido", style_bullet))
    story.append(Paragraph("   • Fecha del pago", style_bullet))
    story.append(Paragraph("   • Método (transferencia, efectivo, cheque)", style_bullet))
    story.append(Paragraph("   • Banco (si aplica)", style_bullet))
    story.append(Paragraph("   • Referencia (número de transferencia, cheque, etc.)", style_bullet))
    story.append(Paragraph("4. Opcionalmente sube el comprobante de pago", style_bullet))
    story.append(Paragraph("5. Guarda el pago", style_bullet))

    story.append(Paragraph(
        "<b>Consejo:</b> El sistema acepta pagos parciales. Si el cliente paga menos del total, "
        "la factura quedará en estado 'Parcial' mostrando el saldo pendiente.",
        style_tip
    ))
    story.append(PageBreak())

    story.append(Paragraph("Notas de Crédito", style_h2))
    story.append(Paragraph(
        "Si necesitas reducir el saldo de una factura (por descuento, error, devolución), "
        "puedes crear una Nota de Crédito:",
        style_body
    ))
    story.append(Paragraph("1. Abre el detalle de la factura", style_bullet))
    story.append(Paragraph("2. Haz clic en <b>Nueva Nota de Crédito</b>", style_bullet))
    story.append(Paragraph("3. Ingresa el monto y el motivo", style_bullet))
    story.append(Paragraph("4. El sistema reduce automáticamente el saldo de la factura", style_bullet))

    story.append(Paragraph("Editar una Factura", style_h2))
    story.append(Paragraph(
        "Puedes editar una factura siempre que <b>no hayas marcado el DTE como emitido</b>. "
        "Una vez emitido el DTE oficial, la factura se bloquea para mantener la integridad fiscal.",
        style_body
    ))
    story.append(Paragraph(
        "Lo que puedes editar en una pre-factura:",
        style_body
    ))
    story.append(Paragraph("• Número de factura", style_bullet))
    story.append(Paragraph("• Tipo de factura", style_bullet))
    story.append(Paragraph("• Fecha de emisión y vencimiento", style_bullet))
    story.append(Paragraph("• Agregar o quitar items", style_bullet))
    story.append(Paragraph("• Subir el PDF de la factura oficial", style_bullet))

    story.append(Paragraph("Eliminar Pagos", style_h2))
    story.append(Paragraph(
        "Si registraste un pago por error, puedes eliminarlo desde el detalle de la factura. "
        "Al pasar el mouse sobre el pago, aparecerá un botón de eliminar. El sistema recalculará "
        "automáticamente el saldo.",
        style_body
    ))

    story.append(Paragraph("Exportar a Excel", style_h2))
    story.append(Paragraph(
        "Usa el botón <b>Exportar</b> para descargar el listado de facturas en formato Excel. "
        "Puedes exportar todas o solo las que hayas filtrado.",
        style_body
    ))
    story.append(PageBreak())

    # =========================================
    # 6. ESTADOS DE CUENTA CLIENTES
    # =========================================

    story.append(Paragraph("6. Estados de Cuenta de Clientes", style_h1))

    story.append(Paragraph(
        "Esta sección te da una vista consolidada por cliente. Es ideal para revisar cuánto "
        "te debe cada cliente y el detalle de sus facturas.",
        style_body
    ))

    story.append(Paragraph("Cómo usar esta sección", style_h2))
    story.append(Paragraph("1. Selecciona un cliente de la lista izquierda", style_bullet))
    story.append(Paragraph("2. Verás su resumen: total facturado, pagado y pendiente", style_bullet))
    story.append(Paragraph("3. Abajo aparecen todas sus facturas", style_bullet))
    story.append(Paragraph("4. Puedes filtrar por estado, fecha o buscar por número", style_bullet))

    story.append(Paragraph(
        "Desde aquí también puedes registrar pagos, crear notas de crédito y ver el detalle "
        "completo de cada factura, igual que en el módulo de CXC.",
        style_body
    ))

    story.append(Paragraph(
        "<b>Consejo:</b> Usa esta vista cuando un cliente llame preguntando por su cuenta. "
        "Tendrás toda su información en un solo lugar.",
        style_tip
    ))
    story.append(PageBreak())

    # =========================================
    # 7. PAGOS A PROVEEDORES
    # =========================================

    story.append(Paragraph("7. Pagos a Proveedores", style_h1))

    story.append(Paragraph(
        "Aquí registras todos los gastos que pagas a tus proveedores: transporte, almacenaje, "
        "impuestos, navieras, etc. Cada gasto puede vincularse a una orden de servicio.",
        style_body
    ))

    story.append(Paragraph("Crear un Nuevo Gasto", style_h2))
    story.append(Paragraph("1. Haz clic en <b>Nuevo Gasto</b>", style_bullet))
    story.append(Paragraph("2. Selecciona la <b>Orden de Servicio</b> relacionada", style_bullet))
    story.append(Paragraph("3. Elige el <b>Proveedor</b>", style_bullet))
    story.append(Paragraph("4. Define el <b>Tipo de Gasto</b>:", style_bullet))

    expense_types = [
        ["Tipo", "¿Qué es?", "¿Se cobra al cliente?"],
        ["Costo Directo", "Gastos operativos propios", "No directamente"],
        ["Cargo a Cliente", "Gastos que el cliente reembolsa", "Sí"],
        ["Gasto Operación", "Gastos administrativos generales", "No"],
    ]

    t_exp = Table(expense_types, colWidths=[1.3*inch, 2.7*inch, 1.5*inch])
    t_exp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]))
    story.append(t_exp)
    story.append(Spacer(1, 10))

    story.append(Paragraph("5. Ingresa el monto, concepto y número de factura del proveedor", style_bullet))
    story.append(Paragraph("6. Sube el comprobante o factura del proveedor", style_bullet))
    story.append(Paragraph("7. Guarda el gasto", style_bullet))

    story.append(Paragraph("Estados de los Gastos", style_h2))
    story.append(Paragraph("• <b>Pendiente:</b> Registrado pero no pagado", style_bullet))
    story.append(Paragraph("• <b>Aprobado:</b> Listo para pagar", style_bullet))
    story.append(Paragraph("• <b>Pago Parcial:</b> Se ha pagado una parte", style_bullet))
    story.append(Paragraph("• <b>Pagado:</b> Completamente pagado", style_bullet))

    story.append(Paragraph("Registrar Pago al Proveedor", style_h2))
    story.append(Paragraph(
        "Cuando pagas a un proveedor, haz clic en el ícono de pago del gasto correspondiente. "
        "Ingresa el monto, fecha, método de pago y referencia. El sistema actualiza el saldo automáticamente.",
        style_body
    ))

    story.append(Paragraph(
        "<b>Importante:</b> Solo puedes eliminar un gasto si no tiene pagos registrados y no ha "
        "sido facturado al cliente. Esto protege la integridad de tu contabilidad.",
        style_warning
    ))
    story.append(PageBreak())

    # =========================================
    # 8. ESTADOS DE CUENTA PROVEEDORES
    # =========================================

    story.append(Paragraph("8. Estados de Cuenta de Proveedores", style_h1))

    story.append(Paragraph(
        "Similar al estado de cuenta de clientes, pero para lo que tú debes. Selecciona un "
        "proveedor y verás todas las facturas pendientes de pago.",
        style_body
    ))

    story.append(Paragraph(
        "Útil para planificar tus pagos de la semana o cuando un proveedor te solicita "
        "información de su cuenta.",
        style_body
    ))
    story.append(PageBreak())

    # =========================================
    # 9. CATÁLOGOS
    # =========================================

    story.append(Paragraph("9. Catálogos del Sistema", style_h1))

    story.append(Paragraph(
        "Los catálogos son las listas maestras que alimentan al sistema. Mantenerlos actualizados "
        "hace que tu trabajo diario sea más rápido y ordenado.",
        style_body
    ))

    catalog_list = [
        ["Catálogo", "¿Para qué sirve?"],
        ["Categorías de Proveedor", "Clasificar proveedores (Naviera, Transporte, Almacén, etc.)"],
        ["Proveedores", "Lista de todos tus proveedores con sus datos de contacto"],
        ["Bancos", "Bancos donde tienes cuentas o recibes pagos"],
        ["Tipos de Embarque", "Importación, Exportación, Tránsito, etc."],
        ["Sub-Clientes", "Divisiones o sucursales de un cliente principal"],
    ]

    t_cat = Table(catalog_list, colWidths=[1.8*inch, 4.5*inch])
    t_cat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_cat)
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<b>Consejo:</b> No elimines proveedores o categorías que ya tienen historial. "
        "En su lugar, desactívalos para que no aparezcan en formularios nuevos pero se "
        "mantenga el registro histórico.",
        style_tip
    ))
    story.append(PageBreak())

    # =========================================
    # 10. SERVICIOS
    # =========================================

    story.append(Paragraph("10. Configuración de Servicios", style_h1))

    story.append(Paragraph(
        "Aquí defines los servicios que ofreces a tus clientes. Es el catálogo de lo que cobras.",
        style_body
    ))

    story.append(Paragraph("Servicios Generales", style_h2))
    story.append(Paragraph(
        "Son los servicios estándar que aplican para todos los clientes. Por ejemplo:",
        style_body
    ))
    story.append(Paragraph("• Servicio de desaduanaje", style_bullet))
    story.append(Paragraph("• Flete interno", style_bullet))
    story.append(Paragraph("• Maniobras de carga/descarga", style_bullet))
    story.append(Paragraph("• Gestión documental", style_bullet))
    story.append(Spacer(1, 5))
    story.append(Paragraph(
        "Para cada servicio defines: nombre, descripción, precio base y si aplica IVA.",
        style_body
    ))

    story.append(Paragraph("Precios por Cliente", style_h2))
    story.append(Paragraph(
        "Si tienes precios especiales para ciertos clientes, puedes configurarlos aquí. "
        "Cuando crees una orden para ese cliente, el sistema sugerirá automáticamente "
        "el precio especial en lugar del general.",
        style_body
    ))
    story.append(Paragraph("1. Ve a la pestaña <b>Precios por Cliente</b>", style_bullet))
    story.append(Paragraph("2. Selecciona el cliente", style_bullet))
    story.append(Paragraph("3. Agrega los servicios con el precio acordado", style_bullet))
    story.append(PageBreak())

    # =========================================
    # 11. USUARIOS
    # =========================================

    story.append(Paragraph("11. Gestión de Usuarios", style_h1))
    story.append(Paragraph("<i>(Solo administradores)</i>", style_body))
    story.append(Spacer(1, 5))

    story.append(Paragraph(
        "Desde aquí puedes crear, editar y desactivar usuarios del sistema.",
        style_body
    ))

    story.append(Paragraph("Crear un Usuario", style_h2))
    story.append(Paragraph("1. Haz clic en <b>Nuevo Usuario</b>", style_bullet))
    story.append(Paragraph("2. Completa los datos: nombre, apellido, correo", style_bullet))
    story.append(Paragraph("3. Define el nombre de usuario y contraseña temporal", style_bullet))
    story.append(Paragraph("4. Selecciona el rol (Administrador u Operativo)", style_bullet))
    story.append(Paragraph("5. Guarda", style_bullet))

    story.append(Paragraph(
        "<b>Recomendación:</b> Pide al usuario que cambie su contraseña en su primer inicio de sesión.",
        style_tip
    ))

    story.append(Paragraph("Cambiar Contraseña de un Usuario", style_h2))
    story.append(Paragraph(
        "Si un usuario olvidó su contraseña, puedes restablecerla desde el menú de acciones "
        "del usuario (ícono de llave).",
        style_body
    ))
    story.append(PageBreak())

    # =========================================
    # 12. MI PERFIL
    # =========================================

    story.append(Paragraph("12. Mi Perfil", style_h1))

    story.append(Paragraph(
        "Cada usuario puede actualizar su información personal y cambiar su contraseña "
        "desde esta sección. Haz clic en tu nombre en la esquina superior derecha y "
        "selecciona <b>Mi Perfil</b>.",
        style_body
    ))

    story.append(Paragraph("Qué puedes hacer:", style_h2))
    story.append(Paragraph("• Actualizar tu nombre y apellido", style_bullet))
    story.append(Paragraph("• Cambiar tu correo electrónico", style_bullet))
    story.append(Paragraph("• Cambiar tu contraseña (necesitas la actual)", style_bullet))
    story.append(PageBreak())

    # =========================================
    # 13. CONSEJOS Y BUENAS PRÁCTICAS
    # =========================================

    story.append(Paragraph("13. Consejos y Buenas Prácticas", style_h1))

    story.append(Paragraph("Para mantener tu información ordenada", style_h2))

    tips_data = [
        ["Tema", "Recomendación"],
        ["Órdenes de Servicio", "Cierra las órdenes cuando la operación esté completamente finalizada. "
                               "Esto mantiene limpio tu panel y evita confusiones."],
        ["Documentos", "Sube los documentos importantes apenas los tengas. Es más fácil encontrarlos "
                      "cuando están dentro de la orden correspondiente."],
        ["Gastos", "Registra los gastos el mismo día que los pagas. Así no se te acumulan y "
                  "tu información financiera está siempre al día."],
        ["Facturas", "Verifica los montos antes de marcar el DTE como emitido. Después de ese "
                    "punto no podrás hacer cambios."],
        ["Clientes", "Mantén actualizada la información de contacto. Te será útil cuando necesites "
                    "enviar facturas o hacer cobros."],
        ["Créditos", "Revisa periódicamente los límites de crédito y ajústalos según el "
                    "comportamiento de pago de cada cliente."],
    ]

    t_tips = Table(tips_data, colWidths=[1.5*inch, 4.8*inch])
    t_tips.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SUCCESS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    story.append(t_tips)
    story.append(Spacer(1, 15))

    story.append(Paragraph("¿Tienes dudas o problemas?", style_h2))
    story.append(Paragraph(
        "Si algo no funciona como esperas o tienes alguna duda que no está cubierta en "
        "este manual, contacta al administrador del sistema. Estamos aquí para ayudarte.",
        style_body
    ))

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "— Fin del Manual —",
        ParagraphStyle('Center', parent=style_body, alignment=TA_CENTER, textColor=colors.HexColor("#94a3b8"))
    ))

    # =========================================
    # GENERAR PDF
    # =========================================

    doc.build(story)
    print("Manual generado exitosamente: MANUAL_USUARIO_GPRO_LOGISTIC.pdf")


if __name__ == "__main__":
    create_manual()
