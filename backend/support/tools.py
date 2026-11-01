
"""Controlled operations available to the support agent."""

from rest_framework.exceptions import ValidationError

from .serializers import TicketCreateSerializer, TicketSerializer


def create_support_ticket(
    *,
    request,
    workspace,
    subject,
    description,
    priority="medium",
    customer_name=None,
):
    """
    Create a ticket through the existing serializer.

    This function must only be called after explicit user intent
    or confirmation. The serializer must enforce workspace ownership.
    """
    if not subject or not subject.strip():
        raise ValidationError({
            "subject": "A ticket subject is required."
        })

    if not description or not description.strip():
        raise ValidationError({
            "description": "A ticket description is required."
        })

    data = {
        "subject": subject.strip()[:200],
        "description": description.strip(),
        "priority": priority,
    }

    if customer_name:
        data["customer_name"] = customer_name[:150]

    serializer = TicketCreateSerializer(
        data=data,
        context={
            "request": request,
            "workspace": workspace,
        },
    )
    serializer.is_valid(raise_exception=True)

    # Do not assume the serializer assigns workspace correctly:
    # verify this against your TicketCreateSerializer implementation.
    ticket = serializer.save()

    if ticket.workspace_id != workspace.id:
        raise ValidationError({
            "detail": "Ticket workspace assignment is invalid."
        })

    return TicketSerializer(ticket).data
