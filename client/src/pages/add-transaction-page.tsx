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
import Navigation from '@/components/navigation';

export default function AddTransactionPage() {
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [user, setUser] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const cardBg = useColorModeValue('white', 'gray.700');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!amount || !description || !category || !user) {
      setError('Todos los campos son requeridos');
      setIsLoading(false);
      return;
    }

    // TODO: Implement actual transaction creation
    console.log('Creating transaction:', {
      amount,
      description,
      category,
      date,
      user
    });

    setTimeout(() => {
      setIsLoading(false);
      navigate('/transactions');
    }, 1000);
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="2xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <VStack align="start" spacing={1}>
            <Heading size="lg">Agregar Transacción</Heading>
            <Text color="gray.600">Registra un nuevo gasto o ingreso de forma manual</Text>
          </VStack>

          {/* Form */}
          <Card bg={cardBg}>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <VStack spacing={6}>
                  {error && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      {error}
                    </Alert>
                  )}

                  <FormControl isRequired>
                    <FormLabel>Monto</FormLabel>
                    <NumberInput
                      value={amount}
                      onChange={(_, value) => setAmount(value)}
                      precision={2}
                      step={0.01}
                    >
                      <NumberInputField placeholder="0.00" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Usar números negativos para gastos, positivos para ingresos
                    </Text>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Descripción</FormLabel>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Pago de renta, Supermercado, Salario..."
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Selecciona una categoría"
                    >
                      <option value="Vivienda">🏠 Vivienda</option>
                      <option value="Transporte">🚗 Transporte</option>
                      <option value="Alimentación">🍽️ Alimentación</option>
                      <option value="Compras">🛒 Compras</option>
                      <option value="Entretenimiento">🎮 Entretenimiento</option>
                      <option value="Salud">❤️ Salud</option>
                      <option value="Educación">🎓 Educación</option>
                      <option value="Ingresos">💰 Ingresos</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Fecha</FormLabel>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Usuario</FormLabel>
                    <Select
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      placeholder="Selecciona el usuario"
                    >
                      <option value="Juan García">Juan García</option>
                      <option value="María García">María García</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Notas adicionales (opcional)</FormLabel>
                    <Textarea
                      placeholder="Información adicional sobre esta transacción..."
                      rows={3}
                    />
                  </FormControl>

                  <HStack spacing={4} w="full" pt={4}>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/transactions')}
                      flex={1}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={isLoading}
                      loadingText="Guardando..."
                      flex={1}
                    >
                      Guardar Transacción
                    </Button>
                  </HStack>
                </VStack>
              </form>
            </CardBody>
          </Card>

          <Text fontSize="sm" color="gray.500" textAlign="center">
            La transacción será visible inmediatamente en tu dashboard y lista de transacciones
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}