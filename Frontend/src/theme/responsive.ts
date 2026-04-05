import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

const widthScale = width / BASE_WIDTH;
const heightScale = height / BASE_HEIGHT;

export const scale = (size: number): number => Math.round(size * widthScale);

export const verticalScale = (size: number): number => Math.round(size * heightScale);

export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaled = scale(size);
  return Math.round(size + (scaled - size) * factor);
};
