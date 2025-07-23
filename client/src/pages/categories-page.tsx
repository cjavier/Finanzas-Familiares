import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Badge,
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
  useDisclosure,
  Select,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Category } from '@shared/schema';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEllipsisV,
  FaHome,
  FaCar,
  FaUtensils,
  FaShoppingCart,
  FaGamepad,
  FaHeartbeat,
  FaMoneyBill,
  FaMedkit,
  FaBox,
  FaFilm,
  FaShoppingBag
} from 'react-icons/fa';
import { IconType } from 'react-icons';

// Icon mapping for display
const iconMap: Record<string, IconType> = {
  '💰': FaMoneyBill,
  '🏠': FaHome,
  '🛒': FaShoppingCart,
  '🚗': FaCar,
  '🎬': FaFilm,
  '🏥': FaMedkit,
  '🛍': FaShoppingBag,
  '📦': FaBox,
};

// Available icons for selection
const availableIcons = [
  { icon: '💰', component: FaMoneyBill, name: 'Income' },
  { icon: '🏠', component: FaHome, name: 'Housing' },
  { icon: '🛒', component: FaShoppingCart, name: 'Food' },
  { icon: '🚗', component: FaCar, name: 'Transportation' },
  { icon: '🎬', component: FaFilm, name: 'Entertainment' },
  { icon: '🏥', component: FaMedkit, name: 'Healthcare' },
  { icon: '🛍', component: FaShoppingBag, name: 'Shopping' },
  { icon: '📦', component: FaBox, name: 'Other' },
];

// Available colors
const availableColors = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Naranja', value: '#F59E0B' },
  { name: 'Púrpura', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Gris', value: '#6B7280' },
];

export default function CategoriesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  
  // Modal states
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('💰');
  const [categoryColor, setCategoryColor] = useState('#3B82F6');

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string }) => {
      const res = await apiRequest('POST', '/api/categories', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Categoría creada",
        description: "La categoría ha sido creada correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear categoría",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; icon: string; color: string } }) => {
      const res = await apiRequest('PUT', `/api/categories/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada correctamente.",
      });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar categoría",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar categoría",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCategoryName('');
    setCategoryIcon('💰');
    setCategoryColor('#3B82F6');
    setEditingCategory(null);
  };

  const handleOpenModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryIcon(category.icon || '💰');
      setCategoryColor(category.color || '#3B82F6');
    } else {
      resetForm();
    }
    onOpen();
  };

  const handleSave = () => {
    if (!categoryName.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre de la categoría es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: categoryName.trim(),
      icon: categoryIcon,
      color: categoryColor,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    handleOpenModal(category);
  };

  const handleDelete = (category: Category) => {
    if (confirm(`¿Estás seguro de eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const getColorFromHex = (hex: string): string => {
    // Convert hex to chakra color approximation
    const colorMap: Record<string, string> = {
      '#3B82F6': 'blue',
      '#10B981': 'green', 
      '#F59E0B': 'orange',
      '#8B5CF6': 'purple',
      '#EC4899': 'pink',
      '#EF4444': 'red',
      '#6B7280': 'gray',
    };
    return colorMap[hex] || 'blue';
  };

  if (isLoading) {
    return (
      <Box>
        <Navigation />
        <Container maxW="6xl" py={8}>
          <Text>Cargando categorías...</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Gestión de Categorías</Heading>
              <Text color="gray.600">Ver, crear, editar y eliminar categorías</Text>
            </VStack>
            
            <Button colorScheme="blue" leftIcon={<FaPlus />} onClick={() => handleOpenModal()}>
              Nueva Categoría
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {categories.map((category) => {
              const IconComponent = iconMap[category.icon || '📦'] || FaBox;
              const colorScheme = getColorFromHex(category.color || '#3B82F6');
              
              return (
                <Card key={category.id} bg={cardBg} _hover={{ shadow: 'md' }}>
                  <CardBody>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={3} flex={1}>
                        <HStack spacing={3}>
                          <Box
                            p={3}
                            borderRadius="lg"
                            bg={`${colorScheme}.100`}
                          >
                            <Icon as={IconComponent} boxSize={6} color={`${colorScheme}.500`} />
                          </Box>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold" fontSize="lg">
                              {category.name}
                            </Text>
                            <Badge colorScheme="gray" size="sm">
                              {category.isActive ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </VStack>
                        </HStack>
                      </VStack>
                      
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
                            onClick={() => handleEdit(category)}
                          >
                            Editar
                          </MenuItem>
                          <MenuItem 
                            icon={<FaTrash />} 
                            color="red.500"
                            onClick={() => handleDelete(category)}
                          >
                            Eliminar
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </CardBody>
                </Card>
              );
            })}
          </SimpleGrid>
        </VStack>
      </Container>
      
      {/* Category Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nombre de la categoría</FormLabel>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ej: Alimentación, Transporte..."
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Icono</FormLabel>
                <Select
                  value={categoryIcon}
                  onChange={(e) => setCategoryIcon(e.target.value)}
                >
                  {availableIcons.map((iconOption) => (
                    <option key={iconOption.icon} value={iconOption.icon}>
                      {iconOption.icon} {iconOption.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Color</FormLabel>
                <Select
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                >
                  {availableColors.map((colorOption) => (
                    <option key={colorOption.value} value={colorOption.value}>
                      {colorOption.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSave}
              isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {editingCategory ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}