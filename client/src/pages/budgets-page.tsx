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
  Icon,
  Progress,
  Select,
  useColorModeValue,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Collapse,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Budget, Category } from '@shared/schema';
import { 
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { BudgetTransactionList } from '@/components/budget-transaction-list';
import { format } from 'date-fns';

export default function BudgetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  
  // Date navigation state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  // Modal states
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch budget analytics
  const { data: budgetAnalytics = [], isLoading: isLoadingBudgets } = useQuery<any[]>({
    queryKey: ['/api/budgets/analytics', selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      const res = await apiRequest('GET', `/api/budgets/analytics?${params}`);
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch categories for the budget creation form
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: { categoryId: string; amount: string; period: string; startDate: string; endDate?: string }) => {
      const res = await apiRequest('POST', '/api/budgets', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Presupuesto creado",
        description: "El presupuesto ha sido creado correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PUT', `/api/budgets/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Presupuesto actualizado",
        description: "El presupuesto ha sido actualizado correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto ha sido eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Month navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const getMonthName = (month: number, year: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);
  };

  const resetForm = () => {
    setBudgetAmount('');
    setSelectedPeriod('monthly');
    setSelectedCategoryId('');
    setStartDate('');
    setEndDate('');
    setEditingBudget(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    onOpen();
  };

  const handleOpenEdit = (budget: any) => {
    setEditingBudget(budget);
    setBudgetAmount(budget.budgetAmount.toString());
    setSelectedPeriod(budget.period);
    setSelectedCategoryId(budget.categoryId);
    setStartDate(budget.startDate);
    setEndDate(budget.endDate || '');
    onOpen();
  };

  const handleSubmit = () => {
    if (!budgetAmount || !selectedCategoryId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      categoryId: selectedCategoryId,
      amount: budgetAmount,
      period: selectedPeriod,
      startDate: startDate || new Date().toISOString().split('T')[0],
      ...(endDate && { endDate }),
    };

    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.budgetId, data });
    } else {
      createBudgetMutation.mutate(data);
    }
  };

  if (isLoadingBudgets) {
    return (
      <Box>
        <Navigation />
        <Container maxW="6xl" py={8}>
          <VStack spacing={6}>
            <Spinner size="xl" />
            <Text>Cargando presupuestos...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Gestión de Presupuestos</Heading>
              <Text color="gray.600">Visualizar y editar presupuestos asignados a cada categoría</Text>
            </VStack>
            
            <Button
              leftIcon={<Icon as={FaPlus} />}
              colorScheme="blue"
              onClick={handleOpenCreate}
            >
              Crear Presupuesto
            </Button>
          </HStack>

          {/* Month Navigation */}
          <Card bg={cardBg}>
            <CardBody>
              <HStack justify="space-between" align="center">
                <IconButton
                  aria-label="Mes anterior"
                  icon={<FaChevronLeft />}
                  onClick={() => navigateMonth('prev')}
                  variant="ghost"
                  size="sm"
                />
                
                <VStack spacing={1}>
                  <Heading size="md" textAlign="center" textTransform="capitalize">
                    {getMonthName(selectedMonth, selectedYear)}
                  </Heading>
                  {!isCurrentMonth() && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={goToCurrentMonth}
                    >
                      Ir al mes actual
                    </Button>
                  )}
                </VStack>
                
                <IconButton
                  aria-label="Mes siguiente"
                  icon={<FaChevronRight />}
                  onClick={() => navigateMonth('next')}
                  variant="ghost"
                  size="sm"
                />
              </HStack>
            </CardBody>
          </Card>

          {budgetAnalytics.length === 0 ? (
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontSize="lg" color="gray.500">
                    {isCurrentMonth() 
                      ? "No tienes presupuestos configurados para este mes"
                      : `No hay datos de presupuestos para ${getMonthName(selectedMonth, selectedYear).toLowerCase()}`
                    }
                  </Text>
                  {isCurrentMonth() && (
                    <Button
                      leftIcon={<Icon as={FaPlus} />}
                      colorScheme="blue"
                      onClick={handleOpenCreate}
                    >
                      Crear tu primer presupuesto
                    </Button>
                  )}
                  {!isCurrentMonth() && (
                    <Text fontSize="sm" color="gray.400">
                      Los presupuestos se crean para el mes actual. Ve al mes actual para crear presupuestos.
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {budgetAnalytics.map((budget) => (
                  <BudgetCard
                    key={budget.budgetId}
                    budget={budget}
                    cardBg={cardBg}
                    categories={categories}
                    month={selectedMonth}
                    year={selectedYear}
                    isHistorical={!isCurrentMonth()}
                    historicalLabel={getMonthName(selectedMonth, selectedYear)}
                    onEdit={handleOpenEdit}
                    onDelete={deleteBudgetMutation.mutate}
                  />
                ))}
              </SimpleGrid>

              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4}>
                    <VStack spacing={1}>
                      <Heading size="md">Resumen Total</Heading>
                      <Text fontSize="sm" color="gray.600" textTransform="capitalize">
                        {getMonthName(selectedMonth, selectedYear)}
                      </Text>
                    </VStack>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                          ${budgetAnalytics.reduce((sum, b) => sum + b.budgetAmount, 0).toLocaleString()}
                        </Text>
                        <Text fontSize="sm" color="gray.600">Total Asignado</Text>
                      </VStack>
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="red.500">
                          ${budgetAnalytics.reduce((sum, b) => sum + b.spentAmount, 0).toLocaleString()}
                        </Text>
                        <Text fontSize="sm" color="gray.600">Total Gastado</Text>
                      </VStack>
                      <VStack>
                        <Text 
                          fontSize="2xl" 
                          fontWeight="bold" 
                          color={budgetAnalytics.reduce((sum, b) => sum + b.remaining, 0) >= 0 ? 'green.500' : 'red.500'}
                        >
                          ${budgetAnalytics.reduce((sum, b) => sum + b.remaining, 0).toLocaleString()}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {budgetAnalytics.reduce((sum, b) => sum + b.remaining, 0) >= 0 ? 'Disponible' : 'Excedido'}
                        </Text>
                      </VStack>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>
            </>
          )}
        </VStack>
      </Container>

      {/* Create/Edit Budget Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingBudget ? 'Editar Presupuesto' : 'Crear Presupuesto'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Categoría</FormLabel>
                <Select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  placeholder="Selecciona una categoría"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Monto del Presupuesto</FormLabel>
                <NumberInput
                  value={budgetAmount}
                  onChange={(value) => setBudgetAmount(value)}
                  min={0}
                >
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Período</FormLabel>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="custom">Personalizado</option>
                </Select>
              </FormControl>

              {selectedPeriod === 'custom' && (
                <>
                  <FormControl isRequired>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Fecha de Finalización (Opcional)</FormLabel>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={createBudgetMutation.isPending || updateBudgetMutation.isPending}
            >
              {editingBudget ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function BudgetCard({ 
  budget, 
  cardBg, 
  categories, 
  month, 
  year, 
  isHistorical, 
  historicalLabel, 
  onEdit, 
  onDelete 
}: {
  budget: any;
  cardBg: string;
  categories: Category[];
  month: number;
  year: number;
  isHistorical: boolean;
  historicalLabel: string;
  onEdit: (budget: any) => void;
  onDelete: (id: string) => void;
}) {
  const { isOpen, onToggle } = useDisclosure();

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'over': return 'red';
      case 'warning': return 'orange';
      default: return 'green';
    }
  };

  const getBudgetStatusBadge = (status: string) => {
    switch (status) {
      case 'over': return { text: 'Excedido', color: 'red' };
      case 'warning': return { text: 'Cerca del límite', color: 'orange' };
      default: return { text: 'En presupuesto', color: 'green' };
    }
  };

  const statusBadge = getBudgetStatusBadge(budget.status);

  const getBudgetPeriodDates = () => {
    if (budget.period === 'custom') {
      return { 
        fromDate: budget.startDate, 
        toDate: budget.endDate || format(new Date(), 'yyyy-MM-dd') 
      };
    }
    
    // For monthly, weekly, biweekly in analytics view, we show the whole month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return {
      fromDate: format(startDate, 'yyyy-MM-dd'),
      toDate: format(endDate, 'yyyy-MM-dd')
    };
  };

  const { fromDate, toDate } = getBudgetPeriodDates();

  return (
    <Card bg={cardBg}>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Text fontSize="2xl">
                {budget.category.icon || '💰'}
              </Text>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{budget.category.name}</Text>
                <Badge colorScheme={statusBadge.color} size="sm">
                  {statusBadge.text}
                </Badge>
              </VStack>
            </HStack>
            
            <HStack spacing={2}>
              <IconButton
                aria-label="Ver transacciones"
                icon={isOpen ? <FaChevronUp /> : <FaChevronDown />}
                size="sm"
                variant="ghost"
                onClick={onToggle}
              />
              <IconButton
                aria-label="Editar presupuesto"
                icon={<FaEdit />}
                size="sm"
                variant="ghost"
                onClick={() => onEdit(budget)}
              />
              <IconButton
                aria-label="Eliminar presupuesto"
                icon={<FaTrash />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => onDelete(budget.budgetId)}
              />
            </HStack>
          </HStack>

          <Progress 
            value={Math.min(budget.percentage, 100)} 
            colorScheme={getProgressColor(budget.status)}
            size="lg"
            borderRadius="md"
          />

          <HStack justify="space-between" fontSize="sm">
            <Text color="gray.600">
              ${budget.spentAmount.toLocaleString()} gastado
            </Text>
            <Text fontWeight="medium">
              ${budget.budgetAmount.toLocaleString()} asignado
            </Text>
          </HStack>

          <HStack justify="space-between" fontSize="xs" color="gray.500">
            <Text>{budget.percentage.toFixed(1)}% utilizado</Text>
            {budget.isOverBudget ? (
              <Text color="red.500">
                Excedido por ${Math.abs(budget.remaining).toLocaleString()}
              </Text>
            ) : (
              <Text color="green.500">
                Disponible: ${budget.remaining.toLocaleString()}
              </Text>
            )}
          </HStack>

          <VStack spacing={1}>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Período: {budget.period === 'monthly' ? 'Mensual' : budget.period === 'weekly' ? 'Semanal' : budget.period === 'biweekly' ? 'Quincenal' : 'Personalizado'}
            </Text>
            {isHistorical && (
              <Badge size="sm" colorScheme="blue" variant="outline">
                Datos históricos - {historicalLabel}
              </Badge>
            )}
          </VStack>

          <Collapse in={isOpen} animateOpacity>
            <Box mt={4} pt={4} borderTopWidth="1px">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Transacciones</Text>
              <BudgetTransactionList
                categoryId={budget.categoryId}
                fromDate={fromDate}
                toDate={toDate}
                categories={categories}
              />
            </Box>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
}