import Container from "@mui/material/Container";
import type { ContainerProps } from "@mui/material/Container";

export interface BaseContainerProps extends ContainerProps {
  /** Full width, like Vuetify's `<v-container fluid>`. */
  fluid?: boolean;
}

/** Vuetify `<v-container>`: centered, 16px padding, breakpoint max widths. */
export function BaseContainer({ fluid = false, sx, ...props }: BaseContainerProps) {
  return (
    <Container
      maxWidth={fluid ? false : "lg"}
      {...props}
      sx={[{ py: 2, px: 2 }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

export default BaseContainer;
