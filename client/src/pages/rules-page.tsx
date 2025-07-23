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
  Switch,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
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
  Select,
  Textarea,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Rule, Category } from '@shared/schema';
import { FaPlus, FaEdit, FaTrash, FaEllipsisV, FaPlay, FaRobot } from 'react-icons/fa';

export default function RulesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');

  // Modal states
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleField, setRuleField] = useState<'description' | 'amount' | 'date'>('description');
  const [ruleMatchText, setRuleMatchText] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleIsActive, setRuleIsActive] = useState(true);

  // Fetch rules
  const { data: rules = [], isLoading: isLoadingRules } = useQuery<Rule[]>({
    queryKey: ['/api/rules'],
    enabled: !!user,
  });

  // Fetch categories for rule creation
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: { name: string; field: string; matchText: string; categoryId: string; isActive: boolean }) => {
      const res = await apiRequest('POST', '/api/rules', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Regla creada",
        description: "La regla ha sido creada correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la regla.",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PUT', `/api/rules/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Regla actualizada",
        description: "La regla ha sido actualizada correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la regla.",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Regla eliminada",
        description: "La regla ha sido eliminada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la regla.",
        variant: "destructive",
      });
    },
  });

  // Batch categorization mutation
  const applyCategoryRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/transactions/categorize-batch');
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Reglas aplicadas",
        description: `Se categorizaron ${data.categorizedCount} de ${data.totalProcessed} transacciones.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudieron aplicar las reglas.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRuleName('');
    setRuleField('description');
    setRuleMatchText('');
    setRuleCategoryId('');
    setRuleIsActive(true);
    setEditingRule(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    onOpen();
  };

  const handleOpenEdit = (rule: Rule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleField(rule.field as 'description' | 'amount' | 'date');
    setRuleMatchText(rule.matchText);
    setRuleCategoryId(rule.categoryId);
    setRuleIsActive(rule.isActive);
    onOpen();
  };

  const handleSubmit = () => {
    if (!ruleName || !ruleMatchText || !ruleCategoryId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: ruleName,
      field: ruleField,
      matchText: ruleMatchText,
      categoryId: ruleCategoryId,
      isActive: ruleIsActive,
    };

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon || '💰'} ${category.name}` : 'Sin categoría';
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'description': return 'Descripción';
      case 'amount': return 'Monto';
      case 'date': return 'Fecha';
      default: return field;
    }
  };

  const activeRulesCount = rules.filter(rule => rule.isActive).length;

  if (isLoadingRules) {
    return (
      <Box>
        <Navigation />
        <Container maxW="4xl" py={8}>
          <VStack spacing={6}>
            <Spinner size="xl" />
            <Text>Cargando reglas...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      
      <Container maxW="4xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Reglas Automáticas</Heading>
              <Text color="gray.600">Gestión de reglas para clasificación automática de transacciones</Text>
            </VStack>
            
            <HStack spacing={3}>
              <Button
                leftIcon={<FaPlay />}
                colorScheme="green"
                variant="outline"
                onClick={() => applyCategoryRulesMutation.mutate()}
                isLoading={applyCategoryRulesMutation.isPending}
                loadingText="Aplicando..."
              >
                Aplicar Reglas
              </Button>
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                onClick={handleOpenCreate}
              >
                Nueva Regla
              </Button>
            </HStack>
          </HStack>

          {/* Stats */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Stat>
              <StatLabel>Total de Reglas</StatLabel>
              <StatNumber>{rules.length}</StatNumber>
              <StatHelpText>Reglas configuradas</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Reglas Activas</StatLabel>
              <StatNumber color="green.500">{activeRulesCount}</StatNumber>
              <StatHelpText>Aplicándose automáticamente</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Reglas Inactivas</StatLabel>
              <StatNumber color="gray.500">{rules.length - activeRulesCount}</StatNumber>
              <StatHelpText>Pausadas temporalmente</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Help Alert */}
          <Alert status="info" variant="left-accent">
            <AlertIcon />
            <AlertDescription>
              <Text fontWeight="medium">💡 ¿Cómo funcionan las reglas?</Text>
              <Text fontSize="sm" mt={1}>
                Las reglas se aplican automáticamente a las nuevas transacciones. También puedes aplicarlas manualmente a transacciones existentes usando el botón "Aplicar Reglas".
              </Text>
            </AlertDescription>
          </Alert>

          {/* Rules List */}
          {rules.length === 0 ? (
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <FaRobot size={48} color="gray" />
                  <Text fontSize="lg" color="gray.500">
                    No tienes reglas configuradas
                  </Text>
                  <Text fontSize="sm" color="gray.400" textAlign="center">
                    Crea reglas para automatizar la categorización de transacciones basándose en patrones en la descripción, monto o fecha.
                  </Text>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="blue"
                    onClick={handleOpenCreate}
                  >
                    Crear primera regla
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <VStack spacing={4}>
              {rules.map((rule) => (
                <Card key={rule.id} bg={cardBg} w="full">
                  <CardBody>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack spacing={3}>
                          <Badge colorScheme={rule.isActive ? 'green' : 'gray'}>
                            {rule.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                          <Text fontWeight="bold" fontSize="lg">{rule.name}</Text>
                        </HStack>
                        
                        <VStack align="start" spacing={1} fontSize="sm" color="gray.600">
                          <HStack>
                            <Text fontWeight="medium">Campo:</Text>
                            <Text>{getFieldLabel(rule.field)}</Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="medium">Patrón:</Text>
                            <Text fontFamily="mono" bg="gray.100" px={2} py={1} borderRadius="md">
                              "{rule.matchText}"
                            </Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="medium">Categoría:</Text>
                            <Text>{getCategoryName(rule.categoryId)}</Text>
                          </HStack>
                        </VStack>
                      </VStack>

                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FaEllipsisV />}
                          variant="ghost"
                          size="sm"
                          aria-label="Opciones"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<FaEdit />}
                            onClick={() => handleOpenEdit(rule)}
                          >
                            Editar
                          </MenuItem>
                          <MenuItem
                            icon={<FaTrash />}
                            color="red.500"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                          >
                            Eliminar
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Create/Edit Rule Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingRule ? 'Editar Regla' : 'Nueva Regla'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info" size="sm">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Las reglas se aplican en orden. La primera regla que coincida será la que se use para categorizar la transacción.
                </AlertDescription>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Nombre de la Regla</FormLabel>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="ej: Categorizar Soriana como Alimentación"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Campo a Evaluar</FormLabel>
                <Select
                  value={ruleField}
                  onChange={(e) => setRuleField(e.target.value as 'description' | 'amount' | 'date')}
                >
                  <option value="description">Descripción</option>
                  <option value="amount">Monto</option>
                  <option value="date">Fecha</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Patrón de Coincidencia</FormLabel>
                <Input
                  value={ruleMatchText}
                  onChange={(e) => setRuleMatchText(e.target.value)}
                  placeholder={
                    ruleField === 'description' ? 'ej: Soriana, Amazon, Shell' :
                    ruleField === 'amount' ? 'ej: 1500.00' :
                    'ej: 2024-01'
                  }
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {ruleField === 'description' && 'Busca este texto en la descripción de la transacción'}
                  {ruleField === 'amount' && 'Coincide con el monto exacto (valor absoluto)'}
                  {ruleField === 'date' && 'Busca este patrón en la fecha (ej: "2024-01" para enero 2024)'}
                </Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoría Destino</FormLabel>
                <Select
                  value={ruleCategoryId}
                  onChange={(e) => setRuleCategoryId(e.target.value)}
                  placeholder="Selecciona una categoría"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="rule-active" mb="0">
                  Regla Activa
                </FormLabel>
                <Switch
                  id="rule-active"
                  isChecked={ruleIsActive}
                  onChange={(e) => setRuleIsActive(e.target.checked)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
            >
              {editingRule ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}