import * as React from "react"
import { 
  Pagination as MuiPagination,
  PaginationItem as MuiPaginationItem,
  Box,
  useTheme
} from '@mui/material';
import {
  KeyboardArrowLeft as ChevronLeftIcon,
  KeyboardArrowRight as ChevronRightIcon
} from '@mui/icons-material';

interface PaginationProps extends React.ComponentProps<typeof MuiPagination> {
  className?: string;
  count: number;
  page: number;
  onChange: (event: React.ChangeEvent<unknown>, value: number) => void;
}

const Pagination = ({ 
  className,
  count,
  page,
  onChange,
  ...props 
}: PaginationProps) => {
  const theme = useTheme();

  return (
    <Box
      component="nav"
      role="navigation"
      aria-label="pagination"
      className={className}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}
    >
      <MuiPagination
        count={count}
        page={page}
        onChange={onChange}
        renderItem={(item) => (
          <MuiPaginationItem
            slots={{
              previous: ChevronLeftIcon,
              next: ChevronRightIcon
            }}
            {...item}
          />
        )}
        {...props}
      />
    </Box>
  );
};

Pagination.displayName = "Pagination";

export { Pagination };
