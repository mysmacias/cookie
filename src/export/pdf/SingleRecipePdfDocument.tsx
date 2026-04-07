import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import type { ExportRecipeModel } from '../types';
import { PageFooter, RecipePdfContent } from './RecipePdfBlocks';
import { pdfStyles as s } from './styles';

export function SingleRecipePdfDocument({
  model,
  exportedAt,
}: {
  model: ExportRecipeModel;
  exportedAt: Date;
}) {
  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <RecipePdfContent model={model} />
        <PageFooter exportedAt={exportedAt} />
      </Page>
    </Document>
  );
}
