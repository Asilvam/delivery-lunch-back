import { DEFAULT_PORT } from './constants';

export const appConfig = () => ({
  port: Number(process.env.PORT ?? DEFAULT_PORT),
});
