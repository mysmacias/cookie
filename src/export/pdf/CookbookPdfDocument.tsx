import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { ExportRecipeModel } from '../types';
import { PageFooter, RecipePdfContent } from './RecipePdfBlocks';
import { pdfStyles as s } from './styles';

export function CookbookPdfDocument({
  models,
  shoppingListLines,
  exportedAt,
}: {
  models: ExportRecipeModel[];
  shoppingListLines: string[];
  exportedAt: Date;
}) {
  return (
    <Document>
      {/* ---- Cover page ---- */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverBrand}>Cookie</Text>
        <View style={s.coverRule} />
        <Text style={s.coverTitle}>Recipe Collection</Text>
        <Text style={s.coverSubtitle}>{models.length} recipe{models.length !== 1 ? 's' : ''}</Text>
        <Text style={s.coverDate}>{exportedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        <PageFooter exportedAt={exportedAt} />
      </Page>

      {/* ---- Table of contents ---- */}
      <Page size="A4" style={s.page}>
        <Text style={s.tocTitle}>Table of contents</Text>
        <View style={s.tocSubline} />
        {models.map((m, i) => (
          <View key={m.id} style={s.tocRow} wrap={false}>
            <Text style={s.tocNumber}>{i + 1}.</Text>
            <Text style={s.tocRecipeTitle}>{m.title}</Text>
            <Text style={s.tocCategory}>{m.category}</Text>
          </View>
        ))}
        <PageFooter exportedAt={exportedAt} />
      </Page>

      {/* ---- One page-group per recipe ---- */}
      {models.map((m) => (
        <Page key={m.id} size="A4" style={s.page} wrap>
          <RecipePdfContent model={m} />
          <PageFooter exportedAt={exportedAt} />
        </Page>
      ))}

      {/* ---- Shopping list appendix ---- */}
      {shoppingListLines.length > 0 ? (
        <Page size="A4" style={s.page} wrap>
          <Text style={s.appendixTitle}>Combined shopping list</Text>
          <View style={s.appendixSubline} />
          {shoppingListLines.map((line, i) => (
            <View key={i} style={s.shoppingItem} wrap={false}>
              <Text style={s.shoppingBullet}>•</Text>
              <Text style={s.shoppingText}>{line}</Text>
            </View>
          ))}
          <PageFooter exportedAt={exportedAt} />
        </Page>
      ) : null}
    </Document>
  );
}
