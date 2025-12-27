import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Select,
  Button,
  useToast,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Transaction, Category } from '@shared/schema';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetTransactionListProps {
  categoryId: string;
  fromDate: string;
  toDate: string;
  categories: Category[];
}

export function BudgetTransactionList({ categoryId, fromDate, toDate, categories }: BudgetTransactionListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', categoryId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        categoryId,
        fromDate,
        toDate,
        limit: '100' // Reasonable limit for a dropdown view
      });
      const res = await apiRequest('GET', `/api/transactions?${params}`);
      return await res.json();
    },
  });

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
        status: "success",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Error al actualizar",
        status: "error",
      });
    }
  });

  if (isLoading) {
    return (
      <Box py={4} textAlign="center">
        <Spinner size="sm" />
        <Text fontSize="sm" color="gray.500" mt={2}>Cargando transacciones...</Text>
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Text fontSize="sm" color="gray.500">No hay transacciones para este período.</Text>
      </Box>
    );
  }

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Fecha</Th>
            <Th>Descripción</Th>
            <Th isNumeric>Monto</Th>
            <Th width="50px"></Th>
          </Tr>
        </Thead>
        <Tbody>
          {transactions.map((transaction) => (
            <TransactionRow 
              key={transaction.id} 
              transaction={transaction} 
              categories={categories}
              onUpdate={(data) => updateTransactionMutation.mutate({ id: transaction.id, data })}
              isUpdating={updateTransactionMutation.isPending}
            />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

function TransactionRow({ transaction, categories, onUpdate, isUpdating }: { 
  transaction: Transaction; 
  categories: Category[];
  onUpdate: (data: any) => void;
  isUpdating: boolean;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [categoryId, setCategoryId] = useState(transaction.categoryId);

  const handleSave = () => {
    onUpdate({
      amount: amount,
      categoryId: categoryId
    });
    onClose();
  };

  // Helper to find category name for display purposes only if needed, 
  // currently we are just showing the list items.
  // The parent component has the correct categoryId context.
  
  return (
    <Tr>
      <Td fontSize="sm" whiteSpace="nowrap">
        {format(new Date(transaction.date), 'dd MMM', { locale: es })}
      </Td>
      <Td fontSize="sm" maxW="200px" isTruncated title={transaction.description}>
        {transaction.description}
      </Td>
      <Td isNumeric fontSize="sm" fontWeight="medium">
        ${parseFloat(transaction.amount).toLocaleString()}
      </Td>
      <Td>
        <Popover
          isOpen={isOpen}
          onOpen={() => {
            setAmount(transaction.amount.toString());
            setCategoryId(transaction.categoryId);
            onOpen();
          }}
          onClose={onClose}
          placement="left"
          closeOnBlur={false}
        >
          <PopoverTrigger>
            <IconButton
              aria-label="Editar"
              icon={<FaEdit />}
              size="xs"
              variant="ghost"
            />
          </PopoverTrigger>
          <PopoverContent width="300px">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader fontSize="sm" fontWeight="bold">Editar Transacción</PopoverHeader>
            <PopoverBody>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel fontSize="xs">Monto</FormLabel>
                  <NumberInput 
                    size="sm" 
                    value={amount} 
                    onChange={(val) => setAmount(val)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                
                <FormControl>
                  <FormLabel fontSize="xs">Categoría</FormLabel>
                  <Select 
                    size="sm" 
                    value={categoryId} 
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <HStack width="100%" justify="flex-end" pt={2}>
                  <Button size="xs" onClick={onClose}>Cancelar</Button>
                  <Button 
                    size="xs" 
                    colorScheme="blue" 
                    onClick={handleSave}
                    isLoading={isUpdating}
                  >
                    Guardar
                  </Button>
                </HStack>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Td>
    </Tr>
  );
}

