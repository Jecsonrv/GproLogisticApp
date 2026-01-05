from rest_framework import serializers
from .models import PettyCashTransaction, CashCount, CashCountDetail

class PettyCashTransactionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    nit_dui = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = PettyCashTransaction
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def create(self, validated_data):
        # Manejar nit_dui si viene del frontend
        nit_dui_value = validated_data.pop('nit_dui', None)
        if nit_dui_value:
            # Guardar en el campo nit (ya que tenemos ambos campos en el modelo)
            validated_data['nit'] = nit_dui_value
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Manejar nit_dui si viene del frontend
        nit_dui_value = validated_data.pop('nit_dui', None)
        if nit_dui_value:
            validated_data['nit'] = nit_dui_value
        return super().update(instance, validated_data)

class CashCountDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashCountDetail
        fields = ['id', 'denomination', 'quantity', 'total']
        read_only_fields = ('total',)

class CashCountSerializer(serializers.ModelSerializer):
    details = CashCountDetailSerializer(many=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = CashCount
        fields = '__all__'
        read_only_fields = ('created_at', 'performed_by', 'difference', 'calculated_balance')

    def create(self, validated_data):
        details_data = validated_data.pop('details')
        cash_count = CashCount.objects.create(**validated_data)
        
        # Create details
        for detail_data in details_data:
            CashCountDetail.objects.create(cash_count=cash_count, **detail_data)
            
        return cash_count
