from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import update_session_auth_hash
from django.utils import timezone
from .models import User, Notification
from .serializers import (
    UserSerializer,
    UserListSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    NotificationSerializer,
    NotificationListSerializer
)
from .permissions import IsAdminUser


class LoginRateThrottle(ScopedRateThrottle):
    """Rate limiting específico para el endpoint de login"""
    scope = 'login'


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    Vista de login con rate limiting para prevenir ataques de fuerza bruta.
    Límite: 5 intentos por minuto por IP.
    """
    throttle_classes = [LoginRateThrottle]
    permission_classes = [AllowAny]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    filterset_fields = ['role', 'is_active']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        GET: Obtener información del usuario autenticado
        PATCH: Actualizar perfil (first_name, last_name, email)
        """
        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = UserProfileSerializer(
                request.user,
                data=request.data,
                partial=True,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({
                'message': 'Perfil actualizado correctamente',
                'user': serializer.data
            })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Cambiar contraseña del usuario autenticado"""
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Verificar contraseña antigua
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Contraseña incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Establecer nueva contraseña
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Mantener sesión activa
        update_session_auth_hash(request, user)
        
        return Response({'message': 'Contraseña actualizada correctamente'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser], url_path='change_password')
    def reset_password(self, request, pk=None):
        """Resetear contraseña de un usuario (solo admin)"""
        user = self.get_object()
        new_password = request.data.get('password') or request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'error': 'Se requiere nueva contraseña'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response({'message': f'Contraseña reseteada para {user.username}'})


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de notificaciones del usuario autenticado
    
    Endpoints:
    - GET /notifications/ - Lista notificaciones del usuario
    - GET /notifications/{id}/ - Detalle de una notificación
    - DELETE /notifications/{id}/ - Eliminar notificación
    - POST /notifications/{id}/mark_read/ - Marcar como leída
    - POST /notifications/mark_all_read/ - Marcar todas como leídas
    - GET /notifications/unread_count/ - Contador de no leídas
    - POST /notifications/clear_all/ - Eliminar todas las notificaciones
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Solo retorna notificaciones del usuario autenticado"""
        return Notification.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer
    
    def list(self, request):
        """Listar notificaciones con filtros opcionales"""
        queryset = self.get_queryset()
        
        # Filtro por estado de lectura
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filtro por tipo
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filtro por categoría
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Limitar resultados (por defecto 50)
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Añadir conteo de no leídas
        unread_count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).count()
        
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count,
            'total': Notification.objects.filter(user=request.user).count()
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marcar una notificación como leída"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({
            'message': 'Notificación marcada como leída',
            'notification': NotificationListSerializer(notification).data
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marcar todas las notificaciones como leídas"""
        updated = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).update(
            is_read=True, 
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated} notificaciones marcadas como leídas',
            'updated_count': updated
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Obtener contador de notificaciones no leídas"""
        count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        """Eliminar todas las notificaciones del usuario"""
        deleted, _ = Notification.objects.filter(user=request.user).delete()
        
        return Response({
            'message': f'{deleted} notificaciones eliminadas',
            'deleted_count': deleted
        })
    
    @action(detail=False, methods=['post'])
    def clear_read(self, request):
        """Eliminar solo las notificaciones leídas"""
        deleted, _ = Notification.objects.filter(
            user=request.user, 
            is_read=True
        ).delete()
        
        return Response({
            'message': f'{deleted} notificaciones leídas eliminadas',
            'deleted_count': deleted
        })