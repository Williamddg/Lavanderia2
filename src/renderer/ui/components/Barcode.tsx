import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type Props = {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
};

export const Barcode = ({
  value,
  width = 2,
  height = 60,
  displayValue = false
}: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const normalized = String(value ?? '')
      .replace(/[–—−]/g, '-')
      .replace(/'/g, '-')
      .trim()
      .toUpperCase();

    // CODE39 suele ser más tolerante para textos alfanuméricos con guiones
    JsBarcode(svgRef.current, normalized, {
      format: 'CODE128',
      lineColor: '#000',
      background: '#fff',
      width,
      height,
      margin: 0,
      displayValue,
      fontOptions: 'bold'
    });
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} />;
};