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
} from '@chakra-ui/react';
import Navigation from '@/components/navigation';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';

const mockNotifications = [
  {
    id: '1',
    title: 'Presupuesto de Compras excedido',
    message: 'Has superado el presupuesto de $500 en la categoría Compras por $120.',
    type: 'warning',
    isRead: false,
    time: 'Hace 2 horas',
    category: 'presupuesto'
  },
  {
    id: '2',
    title: 'Nueva transacción detectada',
    message: 'Se registró automáticamente una compra en Amazon por $75.',
    type: 'info',
    isRead: false,
    time: 'Hace 4 horas',
    category: 'transaccion'
  },
  {
    id: '3',
    title: 'Categorización automática completada',
    message: '15 transacciones fueron categorizadas automáticamente usando reglas.',
    type: 'success',
    isRead: true,
    time: 'Hace 1 día',
    category: 'sistema'
  },
  {
    id: '4',
    title: 'Archivo procesado exitosamente',
    message: 'El estado de cuenta "enero-2024.pdf" fue procesado. 25 transacciones añadidas.',
    type: 'success',
    isRead: true,
    time: 'Hace 2 días',
    category: 'archivo'
  },
  {
    id: '5',
    title: 'Invitación a equipo pendiente',
    message: 'María García ha sido invitada al equipo "Familia García".',
    type: 'info',
    isRead: true,
    time: 'Hace 3 días',
    category: 'equipo'
  },
];

export default function NotificationsPage() {
  const cardBg = useColorModeValue('white', 'gray.700');
  const unreadBg = useColorModeValue('blue.50', 'blue.900');

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'presupuesto': return '💰';
      case 'transaccion': return '💳';
      case 'sistema': return '⚙️';
      case 'archivo': return '📄';
      case 'equipo': return '👥';
      default: return '📋';
    }
  };

  const unreadCount = mockNotifications.filter(n => !n.isRead).length;

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
              <Button size="sm" leftIcon={<FaCheck />}>
                Marcar como leídas
              </Button>
              <Button size="sm" variant="outline" leftIcon={<FaCheckDouble />}>
                Marcar todas
              </Button>
            </HStack>
          </HStack>

          <VStack spacing={3}>
            {mockNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                bg={notification.isRead ? cardBg : unreadBg} 
                w="full"
                cursor="pointer"
                _hover={{ shadow: 'md' }}
                border={notification.isRead ? 'none' : '1px'}
                borderColor={notification.isRead ? 'transparent' : 'blue.200'}
              >
                <CardBody>
                  <HStack spacing={4} align="start">
                    <Avatar 
                      size="sm" 
                      bg={`${getNotificationColor(notification.type)}.500`}
                      color="white"
                    >
                      {getCategoryIcon(notification.category)}
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
                        {notification.message}
                      </Text>
                      
                      <Text fontSize="xs" color="gray.500">
                        {notification.time}
                      </Text>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>

          {mockNotifications.length === 0 && (
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