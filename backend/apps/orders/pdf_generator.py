"""
Generador de PDFs para facturas
Usa ReportLab para crear facturas en formato PDF profesional
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
from decimal import Decimal


def generate_invoice_pdf(invoice):
    """
    Genera un PDF profesional para una factura
    
    Args:
        invoice: Instancia del modelo Invoice
        
    Returns:
        BytesIO buffer con el PDF generado
    """
    buffer = BytesIO()
    
    # Crear el documento PDF
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=0.75*inch
    )
    
    # Contenedor para los elementos
    elements = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1E40AF'),
        spaceAfter=12,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E40AF'),
        spaceAfter=6
    )
    
    normal_style = styles['Normal']
    
    # ============ ENCABEZADO ============
    # Logo y título de la empresa
    title = Paragraph("<b>GPRO LOGISTIC</b>", title_style)
    elements.append(title)
    
    subtitle = Paragraph("Agencia Aduanal y Servicios Logísticos", normal_style)
    elements.append(subtitle)
    elements.append(Spacer(1, 0.3*inch))
    
    # Información de la factura
    invoice_header = f"""
    <b>FACTURA No. {invoice.invoice_number}</b><br/>
    Fecha: {invoice.invoice_date.strftime('%d/%m/%Y')}<br/>
    {f'Vencimiento: {invoice.due_date.strftime("%d/%m/%Y")}' if invoice.due_date else ''}<br/>
    {f'CCF: {invoice.ccf}' if invoice.ccf else ''}
    """
    elements.append(Paragraph(invoice_header, normal_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # ============ INFORMACIÓN DEL CLIENTE ============
    elements.append(Paragraph("<b>FACTURADO A:</b>", heading_style))
    
    client_info = [
        ['Cliente:', invoice.client.name],
        ['NIT:', invoice.client.nit],
        ['Dirección:', invoice.client.address],
        ['Teléfono:', invoice.client.phone or '-'],
    ]
    
    client_table = Table(client_info, colWidths=[1.5*inch, 4.5*inch])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4B5563')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # ============ ÓRDENES DE SERVICIO ============
    elements.append(Paragraph("<b>DETALLE DE SERVICIOS:</b>", heading_style))
    elements.append(Spacer(1, 0.1*inch))
    
    # Encabezado de la tabla
    data = [
        ['No. Orden', 'DUCA', 'PO', 'Descripción', 'Monto']
    ]
    
    # Agregar órdenes de servicio
    service_orders = invoice.service_orders.all()
    for order in service_orders:
        description = f"Servicios de tramitación aduanal"
        if order.shipment_type:
            description += f" - {order.shipment_type.name}"
        
        data.append([
            order.order_number,
            order.duca or '-',
            order.purchase_order or '-',
            description,
            f"${float(order.total_charges or 0):,.2f}"
        ])
    
    # Crear tabla
    col_widths = [1.2*inch, 1*inch, 1*inch, 2.3*inch, 1*inch]
    orders_table = Table(data, colWidths=col_widths)
    orders_table.setStyle(TableStyle([
        # Encabezado
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        
        # Contenido
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (4, 1), (4, -1), 'RIGHT'),  # Monto alineado a la derecha
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F3F4F6')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    elements.append(orders_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ============ TOTALES ============
    totals_data = [
        ['Subtotal:', f"${float(invoice.total_amount):,.2f}"],
        ['IVA (13%):', f"${float(invoice.total_amount * Decimal('0.13')):,.2f}"],
        ['<b>TOTAL:</b>', f"<b>${float(invoice.total_amount * Decimal('1.13')):,.2f}</b>"],
    ]
    
    totals_table = Table(totals_data, colWidths=[4.5*inch, 2*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#1E40AF')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ============ ESTADO DE PAGO ============
    if invoice.paid_amount > 0:
        payment_data = [
            ['Pagado:', f"${float(invoice.paid_amount):,.2f}"],
            ['<b>Saldo Pendiente:</b>', f"<b>${float(invoice.balance):,.2f}</b>"],
        ]
        
        payment_table = Table(payment_data, colWidths=[4.5*inch, 2*inch])
        payment_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#059669') if invoice.balance == 0 else colors.HexColor('#DC2626')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(payment_table)
        elements.append(Spacer(1, 0.2*inch))
    
    # ============ NOTAS ============
    if invoice.notes:
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("<b>NOTAS:</b>", heading_style))
        elements.append(Paragraph(invoice.notes, normal_style))
    
    # ============ PIE DE PÁGINA ============
    elements.append(Spacer(1, 0.5*inch))
    
    footer_text = """
    <para alignment="center">
    <font size="8" color="#6B7280">
    Gracias por su preferencia<br/>
    GPRO LOGISTIC - Agencia Aduanal y Servicios Logísticos<br/>
    Tel: (503) 2XXX-XXXX | Email: info@gprologistic.com
    </font>
    </para>
    """
    elements.append(Paragraph(footer_text, normal_style))
    
    # Construir el PDF
    doc.build(elements)
    
    # Retornar el buffer
    buffer.seek(0)
    return buffer


def generate_service_order_report_pdf(service_order):
    """
    Genera un PDF de reporte para una orden de servicio
    
    Args:
        service_order: Instancia del modelo ServiceOrder
        
    Returns:
        BytesIO buffer con el PDF generado
    """
    buffer = BytesIO()
    
    # Similar structure to invoice PDF but adapted for service order
    # This can be implemented later based on requirements
    
    return buffer
