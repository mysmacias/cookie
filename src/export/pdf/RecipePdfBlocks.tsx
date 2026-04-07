import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import type { ExportRecipeModel } from '../types';
import { pdfStyles as s } from './styles';

function hasImage(src: string | undefined): src is string {
  return typeof src === 'string' && src.length > 0;
}

export function RecipePdfContent({ model }: { model: ExportRecipeModel }) {
  return (
    <>
      {/* ---- Header ---- */}
      <View style={s.categoryRow}>
        <Text style={s.category}>{model.category}</Text>
        {model.isHeirloom ? <Text style={s.heirloomBadge}>Heirloom</Text> : null}
      </View>
      <Text style={s.title}>{model.title}</Text>
      <Text style={s.description}>{model.description}</Text>

      {/* ---- Metadata strip ---- */}
      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Prep</Text>
          <Text style={s.metaValue}>{model.prepTime}</Text>
        </View>
        {model.bakeTime ? (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Bake</Text>
            <Text style={s.metaValue}>{model.bakeTime}</Text>
          </View>
        ) : null}
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Total</Text>
          <Text style={s.metaValue}>{model.time}</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Difficulty</Text>
          <Text style={s.metaValue}>{model.difficulty}</Text>
        </View>
        {model.yields ? (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Yields</Text>
            <Text style={s.metaValue}>{model.yields}</Text>
          </View>
        ) : null}
      </View>

      {/* ---- Tags ---- */}
      {model.tags?.length ? (
        <View style={s.tagsRow}>
          {model.tags.map((t, i) => (
            <Text key={i} style={s.tag}>{t}</Text>
          ))}
        </View>
      ) : null}

      {/* ---- Hero image ---- */}
      {hasImage(model.image) ? (
        <Image style={s.hero} src={model.image} />
      ) : null}

      {/* ---- Chef's note ---- */}
      {model.chefNote ? (
        <View style={s.chefNoteBox} wrap={false}>
          <Text style={s.chefNoteTitle}>{"Chef's note"}</Text>
          <Text style={s.chefNoteBody}>{model.chefNote}</Text>
        </View>
      ) : null}

      {/* ---- Ingredients ---- */}
      <Text style={s.sectionTitle}>Ingredients</Text>
      <View style={s.sectionSubline} />
      {model.ingredients.map((ing, i) => (
        <View key={i} style={s.ingredientRow} wrap={false}>
          <View style={s.ingredientInner}>
            {hasImage(ing.image) ? (
              <Image style={s.ingredientThumb} src={ing.image} />
            ) : null}
            <Text style={s.ingredientName}>{ing.name}</Text>
          </View>
          <Text style={s.ingredientAmount}>{ing.amount}</Text>
        </View>
      ))}

      {/* ---- Preparation ---- */}
      <View style={s.ruleLight} />
      <Text style={s.sectionTitle}>Preparation</Text>
      <View style={s.sectionSubline} />

      {model.steps.map((step) => (
        <View key={step.index} style={s.stepBlock} wrap={false}>
          <View style={s.stepRow}>
            <View style={s.stepNumberCircle}>
              <Text style={s.stepNumber}>{step.index}</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>{step.title}</Text>
              {step.linkedIngredients.length ? (
                <Text style={s.stepLinked}>
                  Uses: {step.linkedIngredients.map((li) => `${li.name} (${li.amount})`).join(', ')}
                </Text>
              ) : null}
              <Text style={s.stepBody}>{step.description}</Text>
              {hasImage(step.photo) ? (
                <Image style={s.stepPhoto} src={step.photo} />
              ) : null}
              {step.timerLabel ? (
                <Text style={s.stepTimer}>{step.timerLabel}</Text>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

export function PageFooter({ exportedAt }: { exportedAt: Date }) {
  return (
    <View style={s.footer} fixed>
      <Text>Exported from Cookie</Text>
      <Text>{exportedAt.toLocaleDateString()}</Text>
    </View>
  );
}
