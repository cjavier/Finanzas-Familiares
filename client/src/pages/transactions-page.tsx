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
  Checkbox,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { useState, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Transaction, Category } from '@shared/schema';
import { formatYmdForDisplay } from '@/lib/utils';
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

  // Batch selection states
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const { 
    isOpen: isDeleteDialogOpen, 
    onOpen: onDeleteDialogOpen, 
    onClose: onDeleteDialogClose 
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

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

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      const res = await apiRequest('DELETE', '/api/transactions/batch', { transactionIds });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/analytics'] });
      setSelectedTransactions(new Set());
      toast({
        title: "Transacciones eliminadas",
        description: `Se eliminaron ${data.deleted} de ${data.total} transacciones${data.errors.length > 0 ? `. Algunos errores: ${data.errors.slice(0, 2).join(', ')}` : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudieron eliminar las transacciones.",
        variant: "destructive",
      });
    },
  });

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    // Show the absolute value in the input field since all are expenses
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

    // Ensure amount is positive since all are stored as positive costs
    const numericAmount = parseFloat(editAmount);
    const finalAmount = Math.abs(numericAmount).toString();

    const data = {
      amount: finalAmount,
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

  const getAmountColor = () => {
    // Always red since we only track expenses
    return 'red.500';
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
    // Always show as expense amount (positive display value)
    return `$${Math.abs(num).toLocaleString()}`;
  };

  // Batch selection functions
  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(transactions.map(t => t.id));
      setSelectedTransactions(allIds);
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleBatchDelete = () => {
    if (selectedTransactions.size === 0) return;
    onDeleteDialogOpen();
  };

  const confirmBatchDelete = () => {
    const transactionIds = Array.from(selectedTransactions);
    batchDeleteMutation.mutate(transactionIds);
    onDeleteDialogClose();
  };

  const isAllSelected = transactions.length > 0 && selectedTransactions.size === transactions.length;
  const isIndeterminate = selectedTransactions.size > 0 && selectedTransactions.size < transactions.length;

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
              <Heading size="lg">Gastos</Heading>
              <Text color="gray.600">Gestiona y visualiza todos los gastos del equipo</Text>
              {selectedTransactions.size > 0 && (
                <Text fontSize="sm" color="blue.600">
                  {selectedTransactions.size} transacción{selectedTransactions.size !== 1 ? 'es' : ''} seleccionada{selectedTransactions.size !== 1 ? 's' : ''}
                </Text>
              )}
            </VStack>
            
            <HStack spacing={3}>
              {selectedTransactions.size > 0 && (
                <Button
                  leftIcon={<FaTrash />}
                  colorScheme="red"
                  variant="outline"
                  onClick={handleBatchDelete}
                  isLoading={batchDeleteMutation.isPending}
                >
                  Eliminar ({selectedTransactions.size})
                </Button>
              )}
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                onClick={() => navigate('/transactions/add')}
              >
                Nuevo Gasto
              </Button>
            </HStack>
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
                    No se encontraron gastos
                  </Text>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="blue"
                    onClick={() => navigate('/transactions/add')}
                  >
                    Crear primer gasto
                  </Button>
                </VStack>
              ) : (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th width="50px">
                        <Checkbox
                          isChecked={isAllSelected}
                          isIndeterminate={isIndeterminate}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label="Seleccionar todas las transacciones"
                        />
                      </Th>
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
                          <Checkbox
                            isChecked={selectedTransactions.has(transaction.id)}
                            onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                            aria-label={`Seleccionar transacción ${transaction.description}`}
                          />
                        </Td>
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
                            color={getAmountColor()}
                          >
                            {formatAmount(transaction.amount)}
                          </Text>
                        </Td>
                        <Td>
                          <Text>{formatYmdForDisplay(transaction.date)}</Text>
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
          <ModalHeader>Editar Gasto</ModalHeader>
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
                <FormLabel>Monto del Gasto</FormLabel>
                <NumberInput
                  value={editAmount}
                  onChange={(value) => setEditAmount(value)}
                  min={0}
                  precision={2}
                >
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Ingresa el monto del gasto. Se registrará automáticamente como egreso.
                </Text>
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

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirmar eliminación
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Estás seguro de que quieres eliminar {selectedTransactions.size} transacción{selectedTransactions.size !== 1 ? 'es' : ''}? 
              Esta acción no se puede deshacer.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteDialogClose}>
                Cancelar
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmBatchDelete}
                ml={3}
                isLoading={batchDeleteMutation.isPending}
              >
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}