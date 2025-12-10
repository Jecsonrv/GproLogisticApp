from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'role_display', 'is_active', 'password', 'password_confirm', 
                  'date_joined', 'last_login')
        read_only_fields = ('date_joined', 'last_login')
    
    def validate(self, attrs):
        """Validar que las contraseñas coincidan si se proporcionan"""
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)
        
        if password and password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Crear usuario con contraseña hasheada"""
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
        
        return user
    
    def update(self, instance, validated_data):
        """Actualizar usuario, hashear contraseña si se proporciona"""
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

class UserListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'role_display', 'is_active', 'last_login')

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Las contraseñas no coinciden'
            })
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer de autogestión para endpoint users/me/
    Permite al usuario actualizar solo: first_name, last_name, email
    NO permite cambiar: role, is_superuser, is_staff
    """
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'role_display', 'is_active', 'date_joined', 'last_login')
        read_only_fields = ('id', 'username', 'role', 'role_display',
                           'is_active', 'date_joined', 'last_login')

    def validate_email(self, value):
        """
        Validar que el email no esté en uso por otro usuario
        """
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError(
                'Este correo electrónico ya está en uso por otro usuario.'
            )
        return value
