from __future__ import annotations

from io import BytesIO

from app.persistence import get_assessment


def generate_assessment_pdf(assessment_id: str) -> bytes:
    """Generates an A4 PDF assessment report using reportlab."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("reportlab is required for PDF export") from exc

    record = get_assessment(assessment_id)
    if not record:
        raise ValueError("Assessment not found")

    result = record.result
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=12 * mm, bottomMargin=14 * mm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("NutriForge — Child Nutrition Assessment Report", styles["Title"]))
    story.append(Paragraph(f"Assessment ID: {assessment_id} | Generated: {record.created_at.date()} | Standards: WHO 2006", styles["BodyText"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Child Profile", styles["Heading2"]))
    story.append(
        Paragraph(
            f"Name: {result.child.name or 'Not recorded'} | Age: {result.child.age_months} months | Sex: {result.child.sex.title()} | State: {result.child.state} | Region: {result.child.region or 'Not recorded'}",
            styles["BodyText"],
        )
    )
    story.append(Spacer(1, 10))
    story.append(Paragraph("Anthropometric Assessment", styles["Heading2"]))
    table = Table(
        [
            ["Indicator", "Value", "Z-score", "Status"],
            ["Weight-for-Age", f"{result.child.weight_kg} kg", f"{result.growth.waz:.2f}", result.growth.detected_conditions[0] if result.growth.detected_conditions else result.risk_status],
            ["Height-for-Age", f"{result.child.height_cm} cm", f"{result.growth.haz:.2f}", "Stunting" if any("stunting" in item.lower() for item in result.growth.detected_conditions) else "Normal"],
            ["Weight-for-Length/Height", "—", f"{result.growth.whz:.2f}", "Wasting" if any("wasting" in item.lower() for item in result.growth.detected_conditions) else "Normal"],
            ["MUAC", f"{result.child.muac_mm or '—'}", "—", "Recorded" if result.child.muac_mm else "Not recorded"],
        ],
        colWidths=[55 * mm, 35 * mm, 30 * mm, 45 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F3EC")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8C4BC")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Overall Status: {result.risk_status}", styles["Heading2"]))
    story.append(Paragraph(f"Risk Score: {result.growth.confidence:.2f} | Confidence: {result.nutrition.confidence_score}", styles["BodyText"]))
    story.append(Paragraph(f"Referral Required: {'YES' if result.referral_required else 'NO'}", styles["BodyText"]))
    story.append(PageBreak())

    story.append(Paragraph("Projected Growth: With vs Without Intervention", styles["Heading2"]))
    risk_table = Table(
        [
            ["Period", "Without Action", "With Forge Plan"],
            ["3 Month", result.growth.trajectory_projection["without_intervention"].risk_at_3m, result.growth.trajectory_projection["with_forge_plan"].with_forge_plan[2].risk_level],
            ["6 Month", result.growth.trajectory_projection["without_intervention"].risk_at_6m, result.growth.trajectory_projection["with_forge_plan"].with_forge_plan[5].risk_level],
            ["12 Month", result.growth.trajectory_projection["without_intervention"].risk_at_12m, result.growth.trajectory_projection["with_forge_plan"].with_forge_plan[11].risk_level],
        ],
        colWidths=[35 * mm, 65 * mm, 65 * mm],
    )
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F7F5")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8C4BC")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(risk_table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(result.growth.trajectory_projection["with_forge_plan"].intervention_benefit, styles["BodyText"]))
    story.append(PageBreak())

    story.append(Paragraph(f"Forge Plan — ₹{result.nutrition.estimated_daily_cost_inr}/day", styles["Heading2"]))
    meal_rows = [["Meal", "Hindi / English", "Quantity", "Cost", "Benefit"]]
    for slot, meal in result.nutrition.daily_plan.items():
        meal_rows.append(
            [
                slot.title(),
                f"{meal.name_hi or meal.meal} / {meal.name_en or meal.meal}",
                meal.quantity or "—",
                meal.cost,
                meal.reason,
            ]
        )
    meal_table = Table(meal_rows, colWidths=[22 * mm, 55 * mm, 35 * mm, 20 * mm, 48 * mm])
    meal_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F3EC")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8C4BC")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(meal_table)
    story.append(Spacer(1, 10))
    story.append(Paragraph("ASHA Worker Action Plan", styles["Heading2"]))
    for action in result.nutrition.daily_actions[:3]:
        story.append(Paragraph(f"• {action.detail}", styles["BodyText"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("This report is for nutritional guidance only and does not constitute medical diagnosis per CDSCO guidelines.", styles["BodyText"]))

    doc.build(story)
    return buffer.getvalue()
