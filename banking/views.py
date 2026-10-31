from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsStaffOrAbove
from .models import (
    BankAccount,
    BankTransaction,
    ChartOfAccounts,
    JournalEntry,
    JournalLine,
    Reconciliation,
)
from .serializers import (
    BankAccountSerializer,
    BankTransactionSerializer,
    ChartOfAccountsSerializer,
    JournalEntrySerializer,
    ReconciliationSerializer,
)


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccounts.objects.all()
    serializer_class = ChartOfAccountsSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['account_type', 'is_active']


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.prefetch_related('lines')
    serializer_class = JournalEntrySerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['posted', 'reference_type']

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        entry = self.get_object()
        if entry.posted:
            return Response({'detail': 'Already posted'}, status=400)
        if not entry.is_balanced:
            return Response({'detail': 'Entry is not balanced'}, status=400)
        entry.posted = True
        entry.posted_at = timezone.now()
        entry.save()
        return Response(JournalEntrySerializer(entry).data)

    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        entry = self.get_object()
        if entry.posted:
            return Response({'detail': 'Cannot modify posted entries'}, status=400)
        line = JournalLine.objects.create(
            entry=entry,
            account_id=request.data['account_id'],
            debit=request.data.get('debit', 0),
            credit=request.data.get('credit', 0),
            employer_id=request.data.get('employer_id'),
            description=request.data.get('description', ''),
        )
        return Response(JournalEntrySerializer(entry).data, status=201)


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer
    permission_classes = [IsAdmin]


class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.all()
    serializer_class = BankTransactionSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['bank_account', 'reconciled']


class ReconciliationViewSet(viewsets.ModelViewSet):
    queryset = Reconciliation.objects.all()
    serializer_class = ReconciliationSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['bank_account', 'status']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        recon = self.get_object()
        if recon.status == 'completed':
            return Response({'detail': 'Already completed'}, status=400)
        recon.status = 'completed'
        recon.completed_by = request.user.get_full_name() or request.user.username
        recon.completed_at = timezone.now()
        recon.save()
        return Response(ReconciliationSerializer(recon).data)
