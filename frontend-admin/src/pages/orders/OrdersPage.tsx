import { useState } from 'react';
import { Container, Typography, Card, CardContent, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api/axios';

export default function OrdersPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', dateFrom, dateTo],
    queryFn: () => api.get('/orders', { params: { limit: 100, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } })
      .then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Orders</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 2, flexWrap: 'wrap' }}>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
        <Typography fontSize={12} color="text.secondary">à</Typography>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
        {(dateFrom || dateTo) && (
          <Typography onClick={() => { setDateFrom(''); setDateTo(''); }}
            sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: 'text.primary' } }}>
            Réinitialiser
          </Typography>
        )}
      </Box>

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
