import { Container, Typography, Card, CardContent } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api/axios';

export default function CategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories?limit=100').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Categories</Typography>
      <Card>
        <CardContent>
          <DataGrid
            rows={data || []}
            columns={[{ field: 'id', headerName: 'ID', flex: 1 }]}
            loading={isLoading}
            autoHeight
            pageSizeOptions={[20]}
            sx={{ border: 'none' }}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
