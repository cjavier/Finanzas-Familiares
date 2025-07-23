import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  Avatar,
  useToast,
  Spinner,
  Center,
} from '@chakra-ui/react';
import Navigation from '@/components/navigation';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function NotificationsPage() {
  const cardBg = useColorModeValue('white', 'gray.700');
  const unreadBg = useColorModeValue('blue.50', 'blue.900');
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notificación marcada como leída',
        status: 'success',
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: 'Error al marcar notificación',
        description: 'No se pudo marcar la notificación como leída',
        status: 'error',
        duration: 3000,
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: `${data.count} notificaciones marcadas como leídas`,
        status: 'success',
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: 'Error al marcar notificaciones',
        description: 'No se pudieron marcar todas las notificaciones como leídas',
        status: 'error',
        duration: 3000,
      });
    },
  });

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'budget_alert': return '💰';
      case 'transaction_alert': return '💳';
      case 'system': return '⚙️';
      case 'file_processed': return '📄';
      case 'team_activity': return '👥';
      default: return '📋';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace menos de un minuto';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return date.toLocaleDateString('es-ES');
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  if (isLoading) {
    return (
      <Box>
        <Navigation />
        <Container maxW="4xl" py={8}>
          <Center py={12}>
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" />
              <Text color="gray.600">Cargando notificaciones...</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Navigation />
        <Container maxW="4xl" py={8}>
          <Center py={12}>
            <VStack spacing={4}>
              <Text fontSize="xl" color="red.500">Error al cargar notificaciones</Text>
              <Text color="gray.600">Inténtalo de nuevo más tarde</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      
      <Container maxW="4xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Centro de Notificaciones</Heading>
              <Text color="gray.600">
                Visualización y gestión de notificaciones internas
              </Text>
            </VStack>
            
            <HStack spacing={3}>
              <Badge colorScheme="red" fontSize="sm">
                {unreadCount} sin leer
              </Badge>
              <Button 
                size="sm" 
                leftIcon={<FaCheckDouble />}
                onClick={() => markAllAsReadMutation.mutate()}
                isLoading={markAllAsReadMutation.isPending}
                isDisabled={unreadCount === 0}
              >
                Marcar todas como leídas
              </Button>
            </HStack>
          </HStack>

          <VStack spacing={3}>
            {notifications.map((notification: any) => (
              <Card 
                key={notification.id} 
                bg={notification.isRead ? cardBg : unreadBg} 
                w="full"
                cursor="pointer"
                _hover={{ shadow: 'md' }}
                border={notification.isRead ? 'none' : '1px'}
                borderColor={notification.isRead ? 'transparent' : 'blue.200'}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardBody>
                  <HStack spacing={4} align="start">
                    <Avatar 
                      size="sm" 
                      bg={`${getNotificationColor(notification.type)}.500`}
                      color="white"
                    >
                      {getCategoryIcon(notification.type)}
                    </Avatar>
                    
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="bold" color={notification.isRead ? 'gray.600' : 'black'}>
                          {notification.title}
                        </Text>
                        <HStack spacing={2}>
                          <Badge colorScheme={getNotificationColor(notification.type)} size="sm">
                            {notification.type === 'warning' ? 'Alerta' :
                             notification.type === 'error' ? 'Error' :
                             notification.type === 'success' ? 'Éxito' : 'Info'}
                          </Badge>
                          {!notification.isRead && (
                            <Box w={2} h={2} borderRadius="full" bg="blue.500" />
                          )}
                        </HStack>
                      </HStack>
                      
                      <Text fontSize="sm" color="gray.600">
                        {notification.body}
                      </Text>
                      
                      <Text fontSize="xs" color="gray.500">
                        {formatTimeAgo(notification.createdAt)}
                      </Text>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>

          {notifications.length === 0 && (
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <FaBell size={48} color="gray" />
                  <VStack spacing={2}>
                    <Text fontSize="lg" fontWeight="bold" color="gray.600">
                      No hay notificaciones
                    </Text>
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                      Cuando tengas nuevas notificaciones sobre transacciones, 
                      presupuestos o actividad del equipo, aparecerán aquí.
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </Box>
  );
}