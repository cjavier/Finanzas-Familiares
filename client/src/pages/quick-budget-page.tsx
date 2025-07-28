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
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  Icon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


export default function QuickBudgetPage() {
  const [, navigate] = useLocation();
  const [budgets, setBudgets] = useState<Record<string, number>>({});
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

  // Pre-populate with existing budget data
  useEffect(() => {
    if (existingBudgets.length > 0 && existingCategories.length > 0) {
      const budgetMap: Record<string, number> = {};
      existingBudgets.forEach((budget: any) => {
        const category = existingCategories.find((cat: any) => cat.id === budget.categoryId);
        if (category) {
          budgetMap[category.id] = parseFloat(budget.amount);
        }
      });
      setBudgets(budgetMap);
    }
  }, [existingCategories, existingBudgets]);

  const createBudgetsMutation = useMutation({
    mutationFn: async (budgetData: Array<{categoryId: string, amount: number}>) => {
      const today = new Date();
      const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      
      const promises = budgetData.map(budget => 
        fetch('/api/budgets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryId: budget.categoryId,
            amount: budget.amount.toString(),
            period: 'monthly',
            startDate: startDate,
            isActive: true
          }),
        })
      );
      
      const responses = await Promise.all(promises);
      const failedRequests = responses.filter(response => !response.ok);
      
      if (failedRequests.length > 0) {
        throw new Error(`Failed to create ${failedRequests.length} budgets`);
      }
      
      return { created: responses.length };
    },
    onSuccess: (result) => {
      toast({
        title: 'Presupuestos creados',
        description: `Se crearon ${result.created} presupuestos exitosamente.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      navigate('/budgets');
    },
    onError: (error) => {
      toast({
        title: 'Error al crear presupuestos',
        description: 'No se pudieron crear algunos presupuestos. Inténtalo de nuevo.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const setBudget = (categoryId: string, amount: number) => {
    setBudgets(prev => ({ ...prev, [categoryId]: amount }));
  };

  const handleComplete = () => {
    const budgetData = Object.entries(budgets)
      .filter(([_, amount]) => amount > 0)
      .map(([categoryId, amount]) => ({ categoryId, amount }));
    
    if (budgetData.length === 0) {
      toast({
        title: 'Sin presupuestos',
        description: 'Debes configurar al menos un presupuesto.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    createBudgetsMutation.mutate(budgetData);
  };

  // Filter out categories that already have budgets
  const categoriesWithoutBudgets = existingCategories.filter((category: any) => 
    !existingBudgets.some((budget: any) => budget.categoryId === category.id)
  );

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
          <Heading color="blue.500">Configuración Rápida de Presupuestos</Heading>
          <Text fontSize="lg" color="gray.600">
            Crea presupuestos para tus categorías existentes
          </Text>
        </VStack>

        {/* Budget Configuration */}
        {existingCategories.length > 0 ? (
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
                <Text color="gray.600">Asigna presupuestos mensuales para tus categorías</Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                {existingCategories.map((category: any) => (
                  <Card key={category.id}>
                    <CardBody>
                      <HStack spacing={4}>
                        <Icon as={category.icon} boxSize={6} color={`${category.color}.500`} />
                        <VStack spacing={2} flex={1} align="start">
                          <Text fontWeight="medium">{category.name}</Text>
                          <FormControl>
                            <FormLabel fontSize="sm" mb={1}>Presupuesto mensual</FormLabel>
                            <NumberInput
                              min={0}
                              value={budgets[category.id] || 0}
                              onChange={(_, value) => setBudget(category.id, value)}
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
        ) : (
          <Box
            bg={bgColor}
            border="1px"
            borderColor={borderColor}
            borderRadius="lg"
            p={8}
            w="full"
            boxShadow="lg"
            textAlign="center"
          >
            <VStack spacing={4}>
              <Heading size="lg" color="gray.500">No hay categorías disponibles</Heading>
              <Text color="gray.600">
                Necesitas crear categorías antes de poder configurar presupuestos.
              </Text>
              <Button colorScheme="blue" onClick={() => navigate('/categories')}>
                Ir a Categorías
              </Button>
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
            isLoading={createBudgetsMutation.isPending}
            isDisabled={Object.values(budgets).every(amount => amount === 0)}
          >
            Crear Presupuestos
          </Button>
        </HStack>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Se crearán presupuestos mensuales para las categorías con valores mayores a 0
        </Text>
      </VStack>
    </Container>
  );
}