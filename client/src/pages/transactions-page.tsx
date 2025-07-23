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
  Avatar,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/navigation';
import { 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEllipsisV,
  FaHome,
  FaCar,
  FaUtensils,
  FaShoppingCart
} from 'react-icons/fa';

// Mock data for demonstration
const mockTransactions = [
  {
    id: '1',
    description: 'Pago de renta mensual',
    amount: -1500,
    category: { name: 'Vivienda', icon: FaHome, color: 'blue' },
    date: '2024-01-15',
    user: 'Juan García',
    source: 'Manual',
    status: 'active'
  },
  {
    id: '2',
    description: 'Gasolina Shell',
    amount: -85,
    category: { name: 'Transporte', icon: FaCar, color: 'green' },
    date: '2024-01-14',
    user: 'María García',
    source: 'Archivo CSV',
    status: 'active'
  },
  {
    id: '3',
    description: 'Supermercado Soriana',
    amount: -120,
    category: { name: 'Alimentación', icon: FaUtensils, color: 'orange' },
    date: '2024-01-13',
    user: 'Juan García',
    source: 'Agente IA',
    status: 'active'
  },
  {
    id: '4',
    description: 'Amazon - Compras varias',
    amount: -75,
    category: { name: 'Compras', icon: FaShoppingCart, color: 'purple' },
    date: '2024-01-12',
    user: 'María García',
    source: 'Manual',
    status: 'active'
  },
  {
    id: '5',
    description: 'Salario mensual',
    amount: 8000,
    category: { name: 'Ingresos', icon: FaHome, color: 'green' },
    date: '2024-01-01',
    user: 'Juan García',
    source: 'Manual',
    status: 'active'
  },
];

export default function TransactionsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || transaction.category.name === categoryFilter;
    const matchesUser = userFilter === 'all' || transaction.user === userFilter;
    const matchesSource = sourceFilter === 'all' || transaction.source === sourceFilter;
    
    return matchesSearch && matchesCategory && matchesUser && matchesSource;
  });

  const getAmountColor = (amount: number) => {
    return amount >= 0 ? 'green.500' : 'red.500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'deleted': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const handleEdit = (transactionId: string) => {
    console.log('Edit transaction:', transactionId);
    // TODO: Implement edit functionality
  };

  const handleDelete = (transactionId: string) => {
    console.log('Delete transaction:', transactionId);
    // TODO: Implement delete functionality
  };

  const handleReclassify = (transactionId: string) => {
    console.log('Reclassify transaction:', transactionId);
    // TODO: Implement reclassify functionality
  };

  return (
    <Box>
      <Navigation />
      
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Transacciones</Heading>
              <Text color="gray.600">Gestiona y busca todas tus transacciones</Text>
            </VStack>
            
            <Button colorScheme="blue" leftIcon={<FaPlus />} onClick={() => navigate('/transactions/add')}>
              Nueva Transacción
            </Button>
          </HStack>

          {/* Filters */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4}>
                <Flex 
                  direction={{ base: 'column', md: 'row' }} 
                  gap={4} 
                  w="full" 
                  align={{ base: 'stretch', md: 'center' }}
                >
                  <InputGroup flex={2}>
                    <InputLeftElement pointerEvents="none">
                      <FaSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                      placeholder="Buscar por descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>

                  <Select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    w={{ base: 'full', md: 'auto' }}
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="Vivienda">Vivienda</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Alimentación">Alimentación</option>
                    <option value="Compras">Compras</option>
                    <option value="Ingresos">Ingresos</option>
                  </Select>

                  <Select 
                    value={userFilter} 
                    onChange={(e) => setUserFilter(e.target.value)}
                    w={{ base: 'full', md: 'auto' }}
                  >
                    <option value="all">Todos los usuarios</option>
                    <option value="Juan García">Juan García</option>
                    <option value="María García">María García</option>
                  </Select>

                  <Select 
                    value={sourceFilter} 
                    onChange={(e) => setSourceFilter(e.target.value)}
                    w={{ base: 'full', md: 'auto' }}
                  >
                    <option value="all">Todas las fuentes</option>
                    <option value="Manual">Manual</option>
                    <option value="Archivo CSV">Archivo CSV</option>
                    <option value="Agente IA">Agente IA</option>
                  </Select>
                </Flex>

                <Text fontSize="sm" color="gray.600">
                  Mostrando {filteredTransactions.length} de {mockTransactions.length} transacciones
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Transactions Table */}
          <Card bg={cardBg}>
            <CardBody p={0}>
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Fecha</Th>
                      <Th>Descripción</Th>
                      <Th>Categoría</Th>
                      <Th>Usuario</Th>
                      <Th>Monto</Th>
                      <Th>Fuente</Th>
                      <Th>Estado</Th>
                      <Th>Acciones</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTransactions.map((transaction) => (
                      <Tr 
                        key={transaction.id} 
                        _hover={{ bg: 'gray.50' }}
                        cursor="pointer"
                      >
                        <Td fontSize="sm">
                          {new Date(transaction.date).toLocaleDateString('es-ES')}
                        </Td>
                        
                        <Td>
                          <Text fontWeight="medium" noOfLines={1}>
                            {transaction.description}
                          </Text>
                        </Td>
                        
                        <Td>
                          <HStack spacing={2}>
                            <Box 
                              w={3} 
                              h={3} 
                              borderRadius="sm" 
                              bg={`${transaction.category.color}.500`} 
                            />
                            <Text fontSize="sm">{transaction.category.name}</Text>
                          </HStack>
                        </Td>
                        
                        <Td>
                          <HStack spacing={2}>
                            <Avatar size="xs" name={transaction.user} />
                            <Text fontSize="sm">{transaction.user}</Text>
                          </HStack>
                        </Td>
                        
                        <Td>
                          <Text
                            fontWeight="bold"
                            color={getAmountColor(transaction.amount)}
                          >
                            {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                          </Text>
                        </Td>
                        
                        <Td>
                          <Badge size="sm" variant="outline">
                            {transaction.source}
                          </Badge>
                        </Td>
                        
                        <Td>
                          <Badge colorScheme={getStatusColor(transaction.status)} size="sm">
                            {transaction.status === 'active' ? 'Activo' : transaction.status}
                          </Badge>
                        </Td>
                        
                        <Td>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Opciones"
                              icon={<FaEllipsisV />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem 
                                icon={<FaEdit />} 
                                onClick={() => handleEdit(transaction.id)}
                              >
                                Editar
                              </MenuItem>
                              <MenuItem onClick={() => handleReclassify(transaction.id)}>
                                Reclasificar
                              </MenuItem>
                              <MenuItem 
                                icon={<FaTrash />} 
                                color="red.500"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                Eliminar
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
          </Card>

          {/* Pagination would go here */}
          <HStack justify="center" spacing={2}>
            <Button size="sm" variant="outline">Anterior</Button>
            <Button size="sm" colorScheme="blue">1</Button>
            <Button size="sm" variant="outline">2</Button>
            <Button size="sm" variant="outline">3</Button>
            <Button size="sm" variant="outline">Siguiente</Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}