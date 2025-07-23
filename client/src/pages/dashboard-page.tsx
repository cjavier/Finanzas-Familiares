import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Progress,
  VStack,
  HStack,
  Icon,
  Button,
  Select,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Category } from '@shared/schema';
import { 
  FaHome, 
  FaCar, 
  FaUtensils, 
  FaShoppingCart, 
  FaGamepad, 
  FaHeartbeat,
  FaWallet,
  FaPlus,
  FaRobot,
  FaBell,
  FaMoneyBill,
  FaMedkit,
  FaBox,
  FaFilm,
  FaShoppingBag
} from 'react-icons/fa';
import { IconType } from 'react-icons';

// Icon mapping for categories
const iconMap: Record<string, IconType> = {
  '💰': FaMoneyBill,
  '🏠': FaHome,
  '🛒': FaShoppingCart,
  '🚗': FaCar,
  '🎬': FaFilm,
  '🏥': FaMedkit,
  '🛍': FaShoppingBag,
  '📦': FaBox,
};

// Color mapping for categories
const getColorFromHex = (hex: string): string => {
  const colorMap: Record<string, string> = {
    '#3B82F6': 'blue',
    '#10B981': 'green', 
    '#059669': 'green',
    '#F59E0B': 'orange',
    '#8B5CF6': 'purple',
    '#EC4899': 'pink',
    '#EF4444': 'red',
    '#6B7280': 'gray',
  };
  return colorMap[hex] || 'blue';
};

// Generate mock data for categories that don't have real transactions yet
const generateMockDataForCategory = (category: Category) => {
  const baseAmount = Math.floor(Math.random() * 1000) + 200;
  return {
    budget: baseAmount + Math.floor(Math.random() * 500),
    spent: baseAmount - Math.floor(Math.random() * 200),
    transactions: Math.floor(Math.random() * 15) + 1,
  };
};

const mockNotifications = [
  { id: 1, title: 'Presupuesto de Compras excedido', type: 'warning', time: '2h' },
  { id: 2, title: 'Nueva transacción detectada', type: 'info', time: '4h' },
  { id: 3, title: 'Categorización automática completada', type: 'success', time: '1d' },
];

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('gray.50', 'gray.800');

  // Fetch real categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Generate categories with mock transaction data
  const categoriesWithData = categories.map(category => ({
    ...category,
    icon: iconMap[category.icon || '📦'] || FaBox,
    color: getColorFromHex(category.color || '#3B82F6'),
    ...generateMockDataForCategory(category),
  }));

  const totalBudget = categoriesWithData.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = categoriesWithData.reduce((sum, cat) => sum + cat.spent, 0);
  const totalTransactions = categoriesWithData.reduce((sum, cat) => sum + cat.transactions, 0);

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return 'red';
    if (percentage > 80) return 'orange';
    return 'green';
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Navigation />
        <Container maxW="7xl" py={8}>
          <Text>Cargando dashboard...</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Dashboard</Heading>
              <Text color="gray.600">Resumen del estado financiero de tu familia</Text>
            </VStack>
            
            <HStack spacing={3}>
              <Select w="auto" defaultValue="current-month">
                <option value="current-month">Este mes</option>
                <option value="last-month">Mes pasado</option>
                <option value="current-year">Este año</option>
              </Select>
              
              <Button colorScheme="blue" leftIcon={<FaPlus />} onClick={() => navigate('/transactions/add')}>
                Nueva Transacción
              </Button>
              
              <Button colorScheme="purple" leftIcon={<FaRobot />} onClick={() => navigate('/agente')}>
                Agente IA
              </Button>
            </HStack>
          </HStack>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Presupuesto Total</StatLabel>
                  <StatNumber>${totalBudget.toLocaleString()}</StatNumber>
                  <StatHelpText>Para este mes</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Gastado</StatLabel>
                  <StatNumber>${totalSpent.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={totalSpent > totalBudget ? 'increase' : 'decrease'} />
                    {((totalSpent / totalBudget) * 100).toFixed(1)}% del presupuesto
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Disponible</StatLabel>
                  <StatNumber>${(totalBudget - totalSpent).toLocaleString()}</StatNumber>
                  <StatHelpText color={totalSpent > totalBudget ? 'red.500' : 'green.500'}>
                    {totalSpent > totalBudget ? 'Excedido' : 'Restante'}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Transacciones</StatLabel>
                  <StatNumber>{totalTransactions}</StatNumber>
                  <StatHelpText>Este mes</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Categories Progress */}
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md">Progreso por Categoría</Heading>
            </CardHeader>
            <CardBody>
              {categoriesWithData.length === 0 ? (
                <VStack spacing={4} py={8}>
                  <Text color="gray.500">No hay categorías disponibles</Text>
                  <Button colorScheme="blue" onClick={() => navigate('/categories')}>
                    Crear categorías
                  </Button>
                </VStack>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {categoriesWithData.map((category) => {
                  const percentage = (category.spent / category.budget) * 100;
                  const progressColor = getProgressColor(category.spent, category.budget);
                  
                  return (
                    <VStack key={category.id} spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <HStack spacing={3}>
                          <Icon as={category.icon} color={`${category.color}.500`} boxSize={5} />
                          <Text fontWeight="medium">{category.name}</Text>
                        </HStack>
                        <Badge colorScheme={progressColor} fontSize="xs">
                          {percentage.toFixed(0)}%
                        </Badge>
                      </HStack>
                      
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        colorScheme={progressColor}
                        size="md"
                        borderRadius="md"
                      />
                      
                      <HStack justify="space-between" fontSize="sm" color="gray.600">
                        <Text>${category.spent.toLocaleString()} gastado</Text>
                        <Text>${category.budget.toLocaleString()} presupuesto</Text>
                      </HStack>
                      
                      <Text fontSize="xs" color="gray.500">
                        {category.transactions} transacciones
                      </Text>
                    </VStack>
                  );
                  })}
                </SimpleGrid>
              )}
            </CardBody>
          </Card>

          {/* Quick Actions & Notifications */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Quick Actions */}
            <Card bg={cardBg}>
              <CardHeader>
                <Heading size="md">Acciones Rápidas</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3}>
                  <Button 
                    w="full" 
                    leftIcon={<FaPlus />} 
                    onClick={() => navigate('/transactions/add')}
                    colorScheme="blue"
                  >
                    Agregar Transacción
                  </Button>
                  
                  <Button 
                    w="full" 
                    leftIcon={<FaRobot />} 
                    onClick={() => navigate('/agente')}
                    colorScheme="purple"
                  >
                    Abrir Agente IA
                  </Button>
                  
                  <Button 
                    w="full" 
                    leftIcon={<FaWallet />} 
                    onClick={() => navigate('/budgets')}
                    variant="outline"
                  >
                    Gestionar Presupuestos
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            {/* Recent Notifications */}
            <Card bg={cardBg}>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">Notificaciones Recientes</Heading>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    leftIcon={<FaBell />}
                    onClick={() => navigate('/notifications')}
                  >
                    Ver todas
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {mockNotifications.map((notification) => (
                    <HStack key={notification.id} p={3} borderRadius="md" bg="gray.50">
                      <Badge colorScheme={getNotificationColor(notification.type)} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {notification.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Hace {notification.time}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}