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
import { apiRequest } from '@/lib/queryClient';
import { Category, Transaction, Notification } from '@shared/schema';
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

// Dashboard data interface
interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    transactionCount: number;
  };
  budgets: {
    totalBudget: number;
    totalSpent: number;
    overBudgetCategories: number;
    underBudgetCategories: number;
    categories: Array<{
      categoryId: string;
      budgetAmount: number;
      spentAmount: number;
      percentage: number;
      isOverBudget: boolean;
    }>;
  };
  recentTransactions: Transaction[];
  notifications: {
    unread: number;
    recent: Notification[];
  };
  spendingByCategory: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    amount: number;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    data: any;
  }>;
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('gray.50', 'gray.800');

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/dashboard');
      return await res.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch categories for mapping icons and colors
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Create category lookup for icons and colors
  const categoryLookup = categories.reduce((acc, cat) => {
    acc[cat.id] = {
      icon: iconMap[cat.icon || '📦'] || FaBox,
      color: getColorFromHex(cat.color || '#3B82F6'),
      name: cat.name
    };
    return acc;
  }, {} as Record<string, { icon: IconType; color: string; name: string }>);

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

  if (isLoading || !dashboardData) {
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
                  <StatLabel>Ingresos</StatLabel>
                  <StatNumber color="green.500">${dashboardData.summary.totalIncome.toLocaleString()}</StatNumber>
                  <StatHelpText>Este mes</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Gastos</StatLabel>
                  <StatNumber color="red.500">${dashboardData.summary.totalExpenses.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.summary.totalExpenses > dashboardData.budgets.totalBudget ? 'increase' : 'decrease'} />
                    {dashboardData.budgets.totalBudget > 0 ? 
                      ((dashboardData.summary.totalExpenses / dashboardData.budgets.totalBudget) * 100).toFixed(1) : 0}% del presupuesto
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Flujo Neto</StatLabel>
                  <StatNumber color={dashboardData.summary.netFlow >= 0 ? 'green.500' : 'red.500'}>
                    ${dashboardData.summary.netFlow.toLocaleString()}
                  </StatNumber>
                  <StatHelpText>
                    {dashboardData.summary.netFlow >= 0 ? 'Superávit' : 'Déficit'}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={statBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Transacciones</StatLabel>
                  <StatNumber>{dashboardData.summary.transactionCount}</StatNumber>
                  <StatHelpText>Este mes</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Categories Progress */}
          <Card bg={cardBg}>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Progreso por Categoría</Heading>
                <HStack spacing={2}>
                  <Badge colorScheme="red" fontSize="xs">
                    {dashboardData.budgets.overBudgetCategories} excedidas
                  </Badge>
                  <Badge colorScheme="green" fontSize="xs">
                    {dashboardData.budgets.underBudgetCategories} en presupuesto
                  </Badge>
                </HStack>
              </HStack>
            </CardHeader>
            <CardBody>
              {dashboardData.budgets.categories.length === 0 ? (
                <VStack spacing={4} py={8}>
                  <Text color="gray.500">No hay presupuestos configurados</Text>
                  <Button colorScheme="blue" onClick={() => navigate('/budgets')}>
                    Configurar Presupuestos
                  </Button>
                </VStack>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {dashboardData.budgets.categories.map((budgetCategory) => {
                    const categoryInfo = categoryLookup[budgetCategory.categoryId];
                    const progressColor = getProgressColor(budgetCategory.spentAmount, budgetCategory.budgetAmount);
                    
                    return (
                      <VStack key={budgetCategory.categoryId} spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            {categoryInfo && (
                              <Icon 
                                as={categoryInfo.icon} 
                                color={`${categoryInfo.color}.500`} 
                                boxSize={5} 
                              />
                            )}
                            <Text fontWeight="medium">
                              {categoryInfo?.name || 'Categoría desconocida'}
                            </Text>
                          </HStack>
                          <Badge colorScheme={progressColor} fontSize="xs">
                            {budgetCategory.percentage.toFixed(0)}%
                          </Badge>
                        </HStack>
                        
                        <Progress 
                          value={Math.min(budgetCategory.percentage, 100)} 
                          colorScheme={progressColor}
                          size="md"
                          borderRadius="md"
                        />
                        
                        <HStack justify="space-between" fontSize="sm" color="gray.600">
                          <Text>${budgetCategory.spentAmount.toLocaleString()} gastado</Text>
                          <Text>${budgetCategory.budgetAmount.toLocaleString()} presupuesto</Text>
                        </HStack>
                        
                        {budgetCategory.isOverBudget && (
                          <Text fontSize="xs" color="red.500">
                            ⚠️ Presupuesto excedido por ${(budgetCategory.spentAmount - budgetCategory.budgetAmount).toLocaleString()}
                          </Text>
                        )}
                      </VStack>
                    );
                  })}
                </SimpleGrid>
              )}
            </CardBody>
          </Card>

          {/* Spending by Category Chart */}
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md">Gastos por Categoría (Este Mes)</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData.spendingByCategory.length === 0 ? (
                <Text color="gray.500" textAlign="center" py={8}>
                  No hay gastos registrados este mes
                </Text>
              ) : (
                <VStack spacing={4} align="stretch">
                  {dashboardData.spendingByCategory
                    .filter(cat => cat.amount > 0)
                    .slice(0, 8) // Show top 8 categories
                    .map((category) => {
                      const categoryInfo = categoryLookup[category.id];
                      const maxAmount = Math.max(...dashboardData.spendingByCategory.map(c => c.amount));
                      const percentage = maxAmount > 0 ? (category.amount / maxAmount) * 100 : 0;
                      
                      return (
                        <HStack key={category.id} spacing={4}>
                          <HStack spacing={3} flex={1}>
                            {categoryInfo && (
                              <Icon 
                                as={categoryInfo.icon} 
                                color={`${categoryInfo.color}.500`} 
                                boxSize={4} 
                              />
                            )}
                            <Text fontSize="sm" fontWeight="medium" minW="120px">
                              {category.name}
                            </Text>
                          </HStack>
                          <Box flex={2} bg="gray.100" borderRadius="md" h="6px" pos="relative">
                            <Box
                              bg={`${categoryInfo?.color || 'blue'}.500`}
                              h="100%"
                              borderRadius="md"
                              w={`${percentage}%`}
                              transition="width 0.3s ease"
                            />
                          </Box>
                          <Text fontSize="sm" fontWeight="bold" minW="80px" textAlign="right">
                            ${category.amount.toLocaleString()}
                          </Text>
                        </HStack>
                      );
                    })}
                  
                  {dashboardData.spendingByCategory.length > 8 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => navigate('/transactions')}
                    >
                      Ver todas las categorías
                    </Button>
                  )}
                </VStack>
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

            {/* Recent Notifications & Alerts */}
            <Card bg={cardBg}>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">Notificaciones y Alertas</Heading>
                  <HStack spacing={2}>
                    {dashboardData.notifications.unread > 0 && (
                      <Badge colorScheme="red" fontSize="xs">
                        {dashboardData.notifications.unread} sin leer
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      leftIcon={<FaBell />}
                      onClick={() => navigate('/notifications')}
                    >
                      Ver todas
                    </Button>
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {/* Show alerts first */}
                  {dashboardData.alerts.map((alert, index) => (
                    <HStack key={`alert-${index}`} p={3} borderRadius="md" bg={alert.severity === 'high' ? 'red.50' : 'yellow.50'}>
                      <Badge colorScheme={alert.severity === 'high' ? 'red' : 'orange'} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {alert.message}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Alerta {alert.type}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                  
                  {/* Show recent notifications */}
                  {dashboardData.notifications.recent.map((notification) => (
                    <HStack key={notification.id} p={3} borderRadius="md" bg={notification.isRead ? "gray.50" : "blue.50"}>
                      <Badge colorScheme={getNotificationColor(notification.type)} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {notification.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                  
                  {dashboardData.alerts.length === 0 && dashboardData.notifications.recent.length === 0 && (
                    <Text color="gray.500" textAlign="center" py={4}>
                      No hay notificaciones recientes
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}