import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  Select,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardBody,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  InputGroup,
  InputLeftElement,
  Flex,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  NumberInput,
  NumberInputField,
  useDisclosure,
} from '@chakra-ui/react';
import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Transaction, Category } from '@shared/schema';
import { 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEllipsisV,
} from 'react-icons/fa';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Edit modal states
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');

  // Build query parameters for API call
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    if (statusFilter) params.append('status', statusFilter);
    if (dateFrom) params.append('fromDate', dateFrom);
    if (dateTo) params.append('toDate', dateTo);
    return params.toString();
  }, [searchTerm, selectedCategory, statusFilter, dateFrom, dateTo]);

  // Fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', queryParams],
    queryFn: async () => {
      const url = `/api/transactions${queryParams ? `?${queryParams}` : ''}`;
      const res = await apiRequest('GET', url);
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch categories for filtering and editing
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PUT', `/api/transactions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Transacción actualizada",
        description: "La transacción ha sido actualizada correctamente.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la transacción.",
        variant: "destructive",
      });
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Transacción eliminada",
        description: "La transacción ha sido eliminada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción.",
        variant: "destructive",
      });
    },
  });

  // Categorization mutation
  const categorizeMutation = useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      const res = await apiRequest('PUT', `/api/transactions/${id}/categorize`, { categoryId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      toast({
        title: "Transacción recategorizada",
        description: "La categoría ha sido actualizada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo cambiar la categoría.",
        variant: "destructive",
      });
    },
  });

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditAmount(Math.abs(parseFloat(transaction.amount)).toString());
    setEditDescription(transaction.description);
    setEditCategoryId(transaction.categoryId);
    setEditDate(transaction.date);
    onOpen();
  };

  const handleUpdateTransaction = () => {
    if (!editingTransaction || !editAmount || !editDescription || !editCategoryId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      amount: editAmount,
      description: editDescription,
      categoryId: editCategoryId,
      date: editDate,
    };

    updateTransactionMutation.mutate({ id: editingTransaction.id, data });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon || '💰'} ${category.name}` : 'Sin categoría';
  };

  const getAmountColor = (amount: string) => {
    return parseFloat(amount) >= 0 ? 'green.500' : 'red.500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'deleted': return 'red';
      case 'pending': return 'yellow';  
      default: return 'gray';
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return `${num >= 0 ? '+' : ''}$${Math.abs(num).toLocaleString()}`;
  };

  if (isLoadingTransactions) {
    return (
      <Box>
        <Navigation />
        <Container maxW="6xl" py={8}>
          <VStack spacing={6}>
            <Spinner size="xl" />
            <Text>Cargando transacciones...</Text>
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
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Transacciones</Heading>
              <Text color="gray.600">Gestiona y visualiza todas las transacciones del equipo</Text>
            </VStack>
            
            <Button
              leftIcon={<FaPlus />}
              colorScheme="blue"
              onClick={() => navigate('/transactions/add')}
            >
              Nueva Transacción
            </Button>
          </HStack>

          {/* Filters */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Flex wrap="wrap" gap={4}>
                  <InputGroup maxW="300px">
                    <InputLeftElement>
                      <FaSearch color="gray" />
                    </InputLeftElement>
                    <Input
                      placeholder="Buscar por descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>

                  <Select
                    maxW="200px"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    maxW="150px"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="active">Activas</option>
                    <option value="pending">Pendientes</option>
                    <option value="deleted">Eliminadas</option>
                    <option value="">Todas</option>
                  </Select>
                </Flex>

                <HStack spacing={4}>
                  <FormControl maxW="200px">
                    <FormLabel fontSize="sm">Desde</FormLabel>
                    <Input
                      type="date"
                      size="sm"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </FormControl>

                  <FormControl maxW="200px">
                    <FormLabel fontSize="sm">Hasta</FormLabel>
                    <Input
                      type="date"
                      size="sm"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </FormControl>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Transactions Table */}
          <Card bg={cardBg}>
            <CardBody p={0}>
              {transactions.length === 0 ? (
                <VStack spacing={4} py={8}>
                  <Text fontSize="lg" color="gray.500">
                    No se encontraron transacciones
                  </Text>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="blue"
                    onClick={() => navigate('/transactions/add')}
                  >
                    Crear primera transacción
                  </Button>
                </VStack>
              ) : (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Descripción</Th>
                      <Th>Categoría</Th>
                      <Th>Monto</Th>
                      <Th>Fecha</Th>
                      <Th>Estado</Th>
                      <Th>Acciones</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((transaction) => (
                      <Tr key={transaction.id}>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">{transaction.description}</Text>
                            <Text fontSize="sm" color="gray.500">
                              {transaction.source === 'manual' ? 'Manual' : 
                               transaction.source === 'statement' ? 'Estado de cuenta' :
                               transaction.source === 'ticket' ? 'Ticket' :
                               transaction.source === 'ocr' ? 'OCR' : transaction.source}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <Text>{getCategoryName(transaction.categoryId)}</Text>
                        </Td>
                        <Td>
                          <Text
                            fontWeight="bold"
                            color={getAmountColor(transaction.amount)}
                          >
                            {formatAmount(transaction.amount)}
                          </Text>
                        </Td>
                        <Td>
                          <Text>{new Date(transaction.date).toLocaleDateString()}</Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(transaction.status)}>
                            {transaction.status === 'active' ? 'Activa' :
                             transaction.status === 'pending' ? 'Pendiente' :
                             transaction.status === 'deleted' ? 'Eliminada' : transaction.status}
                          </Badge>
                        </Td>
                        <Td>
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
                                onClick={() => handleOpenEdit(transaction)}
                              >
                                Editar
                              </MenuItem>
                              <MenuItem
                                icon={<FaTrash />}
                                color="red.500"
                                onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                              >
                                Eliminar
                              </MenuItem>
                              {categories.length > 0 && (
                                <>
                                  <MenuItem isDisabled color="gray.500">
                                    Recategorizar a:
                                  </MenuItem>
                                  {categories.map((category) => (
                                    <MenuItem
                                      key={category.id}
                                      onClick={() => categorizeMutation.mutate({
                                        id: transaction.id,
                                        categoryId: category.id
                                      })}
                                      ml={4}
                                    >
                                      {category.icon} {category.name}
                                    </MenuItem>
                                  ))}
                                </>
                              )}
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {/* Edit Transaction Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar Transacción</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Descripción</FormLabel>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descripción de la transacción"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Monto</FormLabel>
                <NumberInput
                  value={editAmount}
                  onChange={(value) => setEditAmount(value)}
                  min={0}
                  precision={2}
                >
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoría</FormLabel>
                <Select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
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
                <FormLabel>Fecha</FormLabel>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
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
              onClick={handleUpdateTransaction}
              isLoading={updateTransactionMutation.isPending}
            >
              Actualizar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}