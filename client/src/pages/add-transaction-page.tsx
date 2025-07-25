import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  Card,
  CardBody,
  HStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Category } from '@shared/schema';

export default function AddTransactionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const cardBg = useColorModeValue('white', 'gray.700');

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: { amount: string; description: string; categoryId: string; date: string }) => {
      const res = await apiRequest('POST', '/api/transactions', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Transacción creada",
        description: "La transacción ha sido creada correctamente.",
      });
      navigate('/transactions');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la transacción.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description || !categoryId) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      amount,
      description,
      categoryId,
      date,
    };

    createTransactionMutation.mutate(data);
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="2xl" py={8}>
        <VStack spacing={6} align="stretch">
          <VStack align="start" spacing={2}>
            <Heading size="lg">Nueva Transacción</Heading>
            <Text color="gray.600">
              Registra una nueva transacción para tu equipo
            </Text>
          </VStack>

          <Card bg={cardBg}>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <VStack spacing={6} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Descripción</FormLabel>
                    <Textarea
                      placeholder="Describe la transacción (ej: Pago de renta, Compra en supermercado)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      resize="vertical"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Monto</FormLabel>
                    <NumberInput
                      value={amount}
                      onChange={(value) => setAmount(value)}
                      precision={2}
                      step={0.01}
                      min={0}
                    >
                      <NumberInputField 
                        placeholder="0.00"
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      Ingresa el monto sin signo. Los gastos se registrarán como negativos automáticamente.
                    </Text>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      placeholder="Selecciona una categoría"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </Select>
                    {categories.length === 0 && !isLoadingCategories && (
                      <Alert status="warning" mt={2}>
                        <AlertIcon />
                        No hay categorías disponibles. Crea algunas categorías primero.
                      </Alert>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Fecha</FormLabel>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </FormControl>

                  <HStack spacing={4} pt={4}>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/transactions')}
                      isDisabled={createTransactionMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={createTransactionMutation.isPending}
                      loadingText="Creando..."
                      flex={1}
                    >
                      Crear Transacción
                    </Button>
                  </HStack>
                </VStack>
              </form>
            </CardBody>
          </Card>

          {/* Quick Tips */}
          <Card bg={cardBg} variant="outline">
            <CardBody>
              <VStack align="start" spacing={3}>
                <Heading size="sm" color="blue.500">
                  💡 Consejos rápidos
                </Heading>
                <VStack align="start" spacing={2} fontSize="sm" color="gray.600">
                  <Text>• Usa descripciones claras para facilitar la búsqueda posterior</Text>
                  <Text>• Los montos se registran como gastos (negativos) por defecto</Text>
                  <Text>• Para ingresos, usa categorías específicas como "Salario" o "Ingresos extra"</Text>
                  <Text>• Puedes editar la transacción más tarde si es necesario</Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}