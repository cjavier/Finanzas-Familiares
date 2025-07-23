import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Progress,
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
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
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

const defaultCategories = [
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

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<Array<{name: string, icon: any, color: string}>>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState('');

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const addCustomCategory = () => {
    if (newCategoryName.trim()) {
      setCustomCategories(prev => [...prev, {
        name: newCategoryName,
        icon: FaMoneyBillWave,
        color: 'purple'
      }]);
      setSelectedCategories(prev => [...prev, newCategoryName]);
      setNewCategoryName('');
    }
  };

  const setBudget = (categoryName: string, amount: number) => {
    setBudgets(prev => ({ ...prev, [categoryName]: amount }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // TODO: Save onboarding data
      console.log('Onboarding data:', {
        selectedCategories,
        customCategories,
        budgets
      });
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const allCategories = [...defaultCategories, ...customCategories];
  const categoriesToBudget = allCategories.filter(cat => selectedCategories.includes(cat.name));

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Selecciona tus categorías';
      case 2: return 'Agrega categorías personalizadas';
      case 3: return 'Asigna presupuestos iniciales';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Elige las categorías que mejor se adapten a tus gastos familiares';
      case 2: return 'Crea categorías adicionales según tus necesidades específicas';
      case 3: return 'Define presupuestos mensuales para cada categoría (puedes cambiarlos después)';
      default: return '';
    }
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={8}>
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading color="blue.500">¡Bienvenido a Finanzas Familiares!</Heading>
          <Text fontSize="lg" color="gray.600">
            Configuremos tu cuenta en 3 sencillos pasos
          </Text>
          <Progress 
            value={(currentStep / 3) * 100} 
            colorScheme="blue" 
            size="lg" 
            w="full" 
            maxW="md"
            borderRadius="md" 
          />
          <Text fontSize="sm" color="gray.500">
            Paso {currentStep} de 3
          </Text>
        </VStack>

        {/* Content */}
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
              <Heading size="lg">{getStepTitle()}</Heading>
              <Text color="gray.600">{getStepDescription()}</Text>
            </VStack>

            {/* Step 1: Select Categories */}
            {currentStep === 1 && (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4} w="full">
                {defaultCategories.map((category) => (
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
            )}

            {/* Step 2: Add Custom Categories */}
            {currentStep === 2 && (
              <VStack spacing={6} w="full">
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

                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Puedes saltear este paso y agregar categorías más tarde
                </Text>
              </VStack>
            )}

            {/* Step 3: Set Budgets */}
            {currentStep === 3 && (
              <VStack spacing={6} w="full">
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

                <Text fontSize="sm" color="gray.500" textAlign="center">
                  No te preocupes, podrás ajustar estos presupuestos en cualquier momento
                </Text>
              </VStack>
            )}
          </VStack>
        </Box>

        {/* Navigation */}
        <HStack spacing={4} w="full" justify="space-between">
          <Button
            variant="outline"
            onClick={handleBack}
            isDisabled={currentStep === 1}
          >
            Anterior
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleNext}
            isDisabled={currentStep === 1 && selectedCategories.length === 0}
          >
            {currentStep === 3 ? 'Finalizar' : 'Siguiente'}
          </Button>
        </HStack>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Todos estos datos se pueden editar después en la configuración
        </Text>
      </VStack>
    </Container>
  );
}