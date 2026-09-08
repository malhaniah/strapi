import type { Schema, Struct } from '@strapi/strapi';

export interface SectionsBullet extends Struct.ComponentSchema {
  collectionName: 'components_sections_bullets';
  info: {
    description: 'A single bullet point of text.';
    displayName: 'Bullet';
    icon: 'bulletList';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SectionsCapability extends Struct.ComponentSchema {
  collectionName: 'components_sections_capabilities';
  info: {
    description: 'A capability block on the home page: title, description, and a list of items.';
    displayName: 'Capability';
    icon: 'layer';
  };
  attributes: {
    description: Schema.Attribute.Text;
    items: Schema.Attribute.JSON;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionsDecision extends Struct.ComponentSchema {
  collectionName: 'components_sections_decisions';
  info: {
    description: 'A design decision in a case study: what was chosen, why, and what was rejected.';
    displayName: 'Decision';
    icon: 'crossCircle';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    reasoning: Schema.Attribute.Text;
    rejectedAlternative: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'sections.bullet': SectionsBullet;
      'sections.capability': SectionsCapability;
      'sections.decision': SectionsDecision;
    }
  }
}
