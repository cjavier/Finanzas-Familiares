import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  Input,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  useColorModeValue,
  Icon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FaHome, 
  FaCar, 
  FaUtensils, 
  FaShoppingCart, 
  FaGamepad, 
  FaHeartbeat,
  FaTshirt,
  FaGraduationCap,
  FaPlane,
  FaGift,
  FaPiggyBank,
  FaMoneyBillWave
} from 'react-icons/fa';

const defaultCategorySuggestions = [
  { name: 'Vivienda', icon: FaHome, color: 'blue' },
  { name: 'Transporte', icon: FaCar, color: 'green' },
  { name: 'Alimentación', icon: FaUtensils, color: 'orange' },
  { name: 'Compras', icon: FaShoppingCart, color: 'purple' },
  { name: 'Entretenimiento', icon: FaGamepad, color: 'pink' },
  { name: 'Salud', icon: FaHeartbeat, color: 'red' },
  { name: 'Ropa', icon: FaTshirt, color: 'teal' },
  { name: 'Educación', icon: FaGraduationCap, color: 'cyan' },
  { name: 'Viajes', icon: FaPlane, color: 'yellow' },
  { name: 'Regalos', icon: FaGift, color: 'gray' },
  { name: 'Ahorros', icon: FaPiggyBank, color: 'green' },
  { name: 'Ingresos', icon: FaMoneyBillWave, color: 'blue' },
];

export default function QuickBudgetPage() {
  const [, navigate] = useLocation();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<Array<{name: string, icon: any, color: string}>>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch existing categories
  const { data: existingCategories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });

  // Fetch existing budgets
  const { data: existingBudgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const response = await fetch('/api/budgets');
      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }
      return response.json();
    },
  });

  // Pre-populate with existing data
  useEffect(() => {
    if (existingCategories.length > 0) {
      setSelectedCategories(existingCategories.map((cat: any) => cat.name));
    }
    if (existingBudgets.length > 0) {
      const budgetMap: Record<string, number> = {};
      existingBudgets.forEach((budget: any) => {
        const category = existingCategories.find((cat: any) => cat.id === budget.categoryId);
        if (category) {
          budgetMap[category.name] = parseFloat(budget.amount);
        }
      });
      setBudgets(budgetMap);
    }
  }, [existingCategories, existingBudgets]);

  const setupMutation = useMutation({
    mutationFn: async (setupData: any) => {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      if (!response.ok) {
        throw new Error('Failed to complete quick setup');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: 'Configuración completada',
        description: `Se crearon ${result.data.categoriesCreated} categorías y ${result.data.budgetsCreated} presupuestos.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      navigate('/budgets');
    },
    onError: (error) => {
      toast({
        title: 'Error en la configuración',
        description: 'No se pudo completar la configuración rápida. Inténtalo de nuevo.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const addCustomCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        name: newCategoryName.trim(),
        icon: FaMoneyBillWave,
        color: 'purple'
      };
      setCustomCategories(prev => [...prev, newCategory]);
      setSelectedCategories(prev => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const setBudget = (categoryName: string, amount: number) => {
    setBudgets(prev => ({ ...prev, [categoryName]: amount }));
  };

  const handleComplete = () => {
    setupMutation.mutate({
      selectedCategories,
      customCategories,
      budgets
    });
  };

  // Filter suggestions to exclude already existing categories
  const availableSuggestions = defaultCategorySuggestions.filter(
    suggestion => !existingCategories.some((existing: any) => existing.name === suggestion.name)
  );

  const allCategories = [...existingCategories, ...customCategories];
  const categoriesToBudget = allCategories.filter(cat => selectedCategories.includes(cat.name));

  if (isLoading) {
    return (
      <Container maxW="4xl" py={8}>
        <VStack spacing={8}>
          <Spinner size="xl" />
          <Text>Cargando configuración actual...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={8}>
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading color="blue.500">Asistente Rápido de Presupuesto</Heading>
          <Text fontSize="lg" color="gray.600">
            Configura rápidamente nuevas categorías y presupuestos
          </Text>
        </VStack>

        {/* Step 1: Select Additional Categories */}
        <Box
          bg={bgColor}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={8}
          w="full"
          boxShadow="lg"
        >
          <VStack spacing={6}>
            <VStack spacing={2} textAlign="center">
              <Heading size="lg">Agregar nuevas categorías</Heading>
              <Text color="gray.600">Selecciona categorías adicionales que necesites</Text>
            </VStack>

            {availableSuggestions.length > 0 ? (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4} w="full">
                {availableSuggestions.map((category) => (
                  <Card
                    key={category.name}
                    cursor="pointer"
                    onClick={() => toggleCategory(category.name)}
                    bg={selectedCategories.includes(category.name) ? `${category.color}.50` : 'white'}
                    border="2px"
                    borderColor={selectedCategories.includes(category.name) ? `${category.color}.500` : 'gray.200'}
                    _hover={{ shadow: 'md' }}
                    transition="all 0.2s"
                  >
                    <CardBody textAlign="center" py={4}>
                      <VStack spacing={2}>
                        <Icon as={category.icon} boxSize={8} color={`${category.color}.500`} />
                        <Text fontSize="sm" fontWeight="medium">
                          {category.name}
                        </Text>
                        {selectedCategories.includes(category.name) && (
                          <Badge colorScheme={category.color} size="sm">
                            Seleccionado
                          </Badge>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Text color="gray.500" textAlign="center">
                Ya tienes todas las categorías sugeridas. Puedes agregar categorías personalizadas abajo.
              </Text>
            )}

            {/* Add Custom Category */}
            <VStack spacing={4} w="full">
              <Text fontWeight="medium">Crear categoría personalizada</Text>
              <HStack w="full" maxW="md">
                <Input
                  placeholder="Nombre de la categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                />
                <Button onClick={addCustomCategory} colorScheme="blue">
                  Agregar
                </Button>
              </HStack>

              {customCategories.length > 0 && (
                <VStack spacing={2} w="full">
                  <Text fontWeight="medium">Categorías personalizadas:</Text>
                  <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} w="full">
                    {customCategories.map((category) => (
                      <Card key={category.name} bg={`${category.color}.50`} border="2px" borderColor={`${category.color}.500`}>
                        <CardBody textAlign="center" py={4}>
                          <VStack spacing={2}>
                            <Icon as={category.icon} boxSize={6} color={`${category.color}.500`} />
                            <Text fontSize="sm" fontWeight="medium">
                              {category.name}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              )}
            </VStack>
          </VStack>
        </Box>

        {/* Step 2: Set Budgets */}
        {categoriesToBudget.length > 0 && (
          <Box
            bg={bgColor}
            border="1px"
            borderColor={borderColor}
            borderRadius="lg"
            p={8}
            w="full"
            boxShadow="lg"
          >
            <VStack spacing={6}>
              <VStack spacing={2} textAlign="center">
                <Heading size="lg">Configurar presupuestos</Heading>
                <Text color="gray.600">Asigna presupuestos mensuales para las categorías seleccionadas</Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                {categoriesToBudget.map((category) => (
                  <Card key={category.name}>
                    <CardBody>
                      <HStack spacing={4}>
                        <Icon as={category.icon} boxSize={6} color={`${category.color}.500`} />
                        <VStack spacing={2} flex={1} align="start">
                          <Text fontWeight="medium">{category.name}</Text>
                          <FormControl>
                            <FormLabel fontSize="sm" mb={1}>Presupuesto mensual</FormLabel>
                            <NumberInput
                              min={0}
                              value={budgets[category.name] || 0}
                              onChange={(_, value) => setBudget(category.name, value)}
                            >
                              <NumberInputField placeholder="0" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>
                        </VStack>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>
        )}

        {/* Actions */}
        <HStack spacing={4} w="full" justify="center">
          <Button
            variant="outline"
            onClick={() => navigate('/budgets')}
          >
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleComplete}
            isLoading={setupMutation.isPending}
            isDisabled={selectedCategories.length === 0}
          >
            Aplicar Configuración
          </Button>
        </HStack>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Esta configuración se aplicará inmediatamente a tu equipo
        </Text>
      </VStack>
    </Container>
  );
}