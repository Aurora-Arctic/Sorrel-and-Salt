/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query CardArrivalsCsv($query: String) {\n    cardArrivalsCsv(query: $query)\n  }\n": typeof types.CardArrivalsCsvDocument,
    "\n  query InvitationCardAttempts($batchId: ID!, $first: Int!, $after: String) {\n    invitationCardAttempts(batchId: $batchId, first: $first, after: $after) {\n      edges {\n        node {\n          id\n          reason\n          attempts\n          cardPosition\n          firstAttemptedAt\n          lastAttemptedAt\n          account {\n            id\n            name\n            email\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.InvitationCardAttemptsDocument,
    "\n  mutation RevokeInvitationCardBatch($batchId: ID!) {\n    revokeInvitationCardBatch(batchId: $batchId) {\n      id\n    }\n  }\n": typeof types.RevokeInvitationCardBatchDocument,
    "\n  mutation CreateInvitationCards(\n    $sheets: Int!\n    $expiresAt: DateTime!\n    $beta: Boolean!\n    $note: String\n  ) {\n    createInvitationCards(sheets: $sheets, expiresAt: $expiresAt, beta: $beta, note: $note) {\n      batchId\n      expiresAt\n      tokens\n    }\n  }\n": typeof types.CreateInvitationCardsDocument,
    "\n  mutation RevokeAdminInvitation($id: ID!) {\n    revokeAdminInvitation(id: $id) {\n      id\n    }\n  }\n": typeof types.RevokeAdminInvitationDocument,
    "\n  mutation CreateAdminInvitation($email: String!, $siteRole: InvitableSiteRole!, $note: String) {\n    createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {\n      id\n    }\n  }\n": typeof types.CreateAdminInvitationDocument,
    "\n  query CompendiumFacetCounts(\n    $query: String\n    $forms: [String!]\n    $withoutReferences: Boolean\n    $withoutForms: Boolean\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $reviewed: Boolean\n    $listing: CompendiumListing\n    $covenIds: [ID!]\n    $covensNot: Boolean\n  ) {\n    compendiumFacets(\n      query: $query\n      forms: $forms\n      withoutReferences: $withoutReferences\n      withoutForms: $withoutForms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      reviewed: $reviewed\n      listing: $listing\n      covenIds: $covenIds\n      covensNot: $covensNot\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      withoutReferences\n      withoutForms\n      reviewed {\n        value\n        count\n      }\n    }\n  }\n": typeof types.CompendiumFacetCountsDocument,
    "\n  query CovenFacetCounts(\n    $workspaceId: ID!\n    $query: String\n    $forms: [String!]\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $source: IngredientSource\n    $inStock: Boolean\n    $lowStockOnly: Boolean\n  ) {\n    workspaceIngredientFacets(\n      workspaceId: $workspaceId\n      query: $query\n      forms: $forms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      source: $source\n      inStock: $inStock\n      lowStockOnly: $lowStockOnly\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      source {\n        value\n        count\n      }\n      inStock\n      lowStockOnly\n    }\n  }\n": typeof types.CovenFacetCountsDocument,
    "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.CreateWorkspaceDocument,
    "\n  mutation AnnotateCupboardEntry(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput!\n    $expectedRevision: Int\n  ) {\n    annotateCupboardEntry(\n      workspaceId: $workspaceId\n      ingredientId: $ingredientId\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      revision\n    }\n  }\n": typeof types.AnnotateCupboardEntryDocument,
    "\n  mutation DeleteWorkspace($workspaceId: ID!) {\n    deleteWorkspace(workspaceId: $workspaceId)\n  }\n": typeof types.DeleteWorkspaceDocument,
    "\n  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {\n    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {\n      id\n      revision\n    }\n  }\n": typeof types.SaveDocumentDraftDocument,
    "\n  mutation DiscardDocumentDraft($documentId: ID!, $expectedRevision: Int!) {\n    discardDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision)\n  }\n": typeof types.DiscardDocumentDraftDocument,
    "\n  mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {\n    publishDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision) {\n      number\n    }\n  }\n": typeof types.PublishDocumentDraftDocument,
    "\n  mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {\n    emailDocumentsToEveryAccount(summaries: $summaries) {\n      canSend\n    }\n  }\n": typeof types.EmailDocumentsToEveryAccountDocument,
    "\n  mutation ResumeDocumentMailing($mailingId: ID!) {\n    resumeDocumentMailing(mailingId: $mailingId) {\n      canSend\n    }\n  }\n": typeof types.ResumeDocumentMailingDocument,
    "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n": typeof types.SetEmailDocument,
    "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateCategoryGroupDocument,
    "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateCategoryGroupDocument,
    "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteCategoryGroupDocument,
    "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n": typeof types.CreateIngredientFormGroupDocument,
    "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n": typeof types.UpdateIngredientFormGroupDocument,
    "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteIngredientFormGroupDocument,
    "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateDeityTraditionDocument,
    "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateDeityTraditionDocument,
    "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteDeityTraditionDocument,
    "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateCategoryDocument,
    "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateCategoryDocument,
    "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n": typeof types.DeleteCategoryDocument,
    "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateIngredientFormValueDocument,
    "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateIngredientFormValueDocument,
    "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n": typeof types.DeleteIngredientFormValueDocument,
    "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateDeityDocument,
    "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateDeityDocument,
    "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n": typeof types.DeleteDeityDocument,
    "\n  mutation CreateCelestialBody($input: CelestialBodyInput!) {\n    createCelestialBody(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateCelestialBodyDocument,
    "\n  mutation UpdateCelestialBody($id: ID!, $input: CelestialBodyInput!) {\n    updateCelestialBody(id: $id, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateCelestialBodyDocument,
    "\n  mutation DeleteCelestialBody($id: ID!) {\n    deleteCelestialBody(id: $id)\n  }\n": typeof types.DeleteCelestialBodyDocument,
    "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateZodiacSignDocument,
    "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateZodiacSignDocument,
    "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n": typeof types.DeleteZodiacSignDocument,
    "\n  mutation CreateHelpArticle($input: HelpArticleInput!) {\n    createHelpArticle(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateHelpArticleDocument,
    "\n  mutation UpdateHelpArticle($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateHelpArticleDocument,
    "\n  mutation DeleteHelpArticle($id: ID!) {\n    deleteHelpArticle(id: $id)\n  }\n": typeof types.DeleteHelpArticleDocument,
    "\n  mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n    }\n  }\n": typeof types.OrderHelpSubPagesDocument,
    "\n  mutation SetHelpArticleShown($id: ID!, $shown: Boolean!) {\n    setHelpArticleShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n": typeof types.SetHelpArticleShownDocument,
    "\n  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      id\n    }\n  }\n": typeof types.AddCupboardEntryDocument,
    "\n  mutation RemoveCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)\n  }\n": typeof types.RemoveCupboardEntryDocument,
    "\n  mutation MakeItOurs($workspaceId: ID!, $ingredientId: ID!) {\n    convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      entry {\n        id\n      }\n    }\n  }\n": typeof types.MakeItOursDocument,
    "\n  mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n": typeof types.DeleteOwnIngredientDocument,
    "\n  mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {\n    setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {\n      id\n    }\n  }\n": typeof types.SetCompendiumEntryReviewedDocument,
    "\n  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {\n    setCompendiumEntryShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n": typeof types.SetCompendiumEntryShownDocument,
    "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n": typeof types.PickerCategoriesDocument,
    "\n  query CompendiumEntryUsers($id: ID!) {\n    compendiumEntryUsers(id: $id)\n  }\n": typeof types.CompendiumEntryUsersDocument,
    "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n": typeof types.PossibleDuplicatesDocument,
    "\n  query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {\n    compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n": typeof types.CompendiumMatchesDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n      revision\n      stock(workspaceId: $workspaceId) {\n        quantityOnHand\n        unit\n        variant {\n          form\n        }\n      }\n    }\n  }\n": typeof types.CreateWorkspaceIngredientDocument,
    "\n  mutation UpdateWorkspaceIngredient(\n    $workspaceId: ID!\n    $id: ID!\n    $input: IngredientUpdateInput!\n    $expectedRevision: Int\n  ) {\n    updateIngredient(\n      workspaceId: $workspaceId\n      id: $id\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": typeof types.UpdateWorkspaceIngredientDocument,
    "\n  mutation AddCupboardEntryFromForm(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput\n  ) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n": typeof types.AddCupboardEntryFromFormDocument,
    "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": typeof types.CreateCompendiumIngredientDocument,
    "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n    $expectedRevision: Int\n  ) {\n    updateCompendiumIngredient(\n      id: $id\n      input: $input\n      endRedirect: $endRedirect\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": typeof types.UpdateCompendiumIngredientDocument,
    "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n": typeof types.DeleteCompendiumIngredientDocument,
    "\n  mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n": typeof types.DeleteWorkspaceIngredientDocument,
    "\n  mutation PromoteFolkName($workspaceId: ID, $id: ID!, $folkNameId: ID!) {\n    promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) {\n      id\n      name\n      slug\n      folkNames {\n        id\n        name\n      }\n    }\n  }\n": typeof types.PromoteFolkNameDocument,
    "\n  query DuplicateQuickLook($id: ID!, $workspaceId: ID!) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      nomenclature\n      description\n      safetyNotes\n      toxic\n      isGlobal\n      retired\n      reviewedAt\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      audit {\n        createdAt\n        updatedAt\n      }\n      cupboardEntry(workspaceId: $workspaceId) {\n        label\n        description\n        safetyNotes\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n      folkNames {\n        name\n      }\n      categories {\n        id\n        name\n        slug\n        group {\n          id\n          name\n          colorDark\n          colorLight\n        }\n      }\n      deities {\n        name\n        deity {\n          otherNames\n          tradition {\n            name\n          }\n        }\n      }\n      variants {\n        id\n        form\n        safetyNotes\n        toxic\n        formChoice {\n          group {\n            icon\n          }\n        }\n      }\n      stock(workspaceId: $workspaceId) {\n        id\n        variant {\n          id\n        }\n        quantityOnHand\n        unit\n        lowStockThreshold\n      }\n    }\n  }\n": typeof types.DuplicateQuickLookDocument,
    "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n": typeof types.CreateReferenceDocument,
    "\n  mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {\n    updateReference(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n": typeof types.UpdateReferenceDocument,
    "\n  query Reference($workspaceId: ID, $id: ID!) {\n    reference(workspaceId: $workspaceId, id: $id) {\n      id\n      kind\n      title\n      authors\n      container\n      contributors\n      edition\n      volume\n      issue\n      series\n      place\n      publisher\n      published\n      pages\n      host\n      url\n      modified\n      accessed\n      note\n      scholarly\n    }\n  }\n": typeof types.ReferenceDocument,
    "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n          kind\n          authors\n          title\n          container\n        }\n      }\n    }\n  }\n": typeof types.ReferenceSuggestionsDocument,
    "\n  query IngredientSummary($id: ID!, $workspaceId: ID) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      description\n      nomenclature\n      isGlobal\n      slug\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      variants {\n        id\n        form\n        formChoice {\n          group {\n            icon\n          }\n        }\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n    }\n  }\n": typeof types.IngredientSummaryDocument,
    "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          icon\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.CommonNameSuggestionsDocument,
    "\n  query CelestialBodySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    celestialBodySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": typeof types.CelestialBodySuggestionsDocument,
    "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": typeof types.ZodiacSuggestionsDocument,
    "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          matchedName\n          curated\n        }\n      }\n    }\n  }\n": typeof types.DeitySuggestionsDocument,
    "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        group\n        node {\n          id\n          name\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.IngredientSuggestionsDocument,
    "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.CompendiumSubstitutesDocument,
    "\n  query IngredientSearchMatches($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n        }\n      }\n    }\n  }\n": typeof types.IngredientSearchMatchesDocument,
    "\n  query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {\n    workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n        }\n      }\n    }\n  }\n": typeof types.IngredientSearchCupboardMatchesDocument,
    "\n  query GrimoireSearchMatches(\n    $workspaceId: ID!\n    $query: String\n    $status: SpellStatus\n    $first: Int\n  ) {\n    grimoire(workspaceId: $workspaceId, query: $query, status: $status, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          title\n        }\n      }\n    }\n  }\n": typeof types.GrimoireSearchMatchesDocument,
    "\n  mutation AcceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n    }\n  }\n": typeof types.AcceptInvitationDocument,
    "\n  mutation RecordCardAttempt($token: String!) {\n    recordCardAttempt(token: $token)\n  }\n": typeof types.RecordCardAttemptDocument,
    "\n  mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {\n    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {\n      id\n    }\n  }\n": typeof types.CreateInvitationDocument,
    "\n  mutation LeaveWorkspace($workspaceId: ID!) {\n    leaveWorkspace(workspaceId: $workspaceId)\n  }\n": typeof types.LeaveWorkspaceDocument,
    "\n  mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n    }\n  }\n": typeof types.PromoteSuccessorDocument,
    "\n  mutation PauseMemberAccess(\n    $workspaceId: ID!\n    $userId: ID!\n    $until: DateTime\n    $note: String\n    $message: String\n  ) {\n    pauseMemberAccess(\n      workspaceId: $workspaceId\n      userId: $userId\n      until: $until\n      note: $note\n      message: $message\n    ) {\n      id\n    }\n  }\n": typeof types.PauseMemberAccessDocument,
    "\n  mutation LiftMemberAccessPause($workspaceId: ID!, $userId: ID!) {\n    liftMemberAccessPause(workspaceId: $workspaceId, userId: $userId) {\n      id\n    }\n  }\n": typeof types.LiftMemberAccessPauseDocument,
    "\n  query MemberPauses($workspaceId: ID!, $userId: ID!) {\n    workspace(id: $workspaceId) {\n      id\n      memberPauses(userId: $userId, first: 25) {\n        edges {\n          node {\n            id\n            until\n            note\n            liftedAt\n            audit {\n              createdAt\n            }\n            setBy {\n              id\n              name\n            }\n            liftedBy {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.MemberPausesDocument,
    "\n  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {\n    removeMember(workspaceId: $workspaceId, userId: $userId)\n  }\n": typeof types.RemoveMemberDocument,
    "\n  mutation UpdateMemberRole($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n      user {\n        id\n      }\n    }\n  }\n": typeof types.UpdateMemberRoleDocument,
    "\n  mutation SetName($name: String!) {\n    setName(name: $name) {\n      id\n      name\n    }\n  }\n": typeof types.SetNameDocument,
    "\n  mutation SetPassword($newPassword: String!) {\n    setPassword(newPassword: $newPassword)\n  }\n": typeof types.SetPasswordDocument,
    "\n  mutation RemoveDeclinedInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": typeof types.RemoveDeclinedInvitationDocument,
    "\n  mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": typeof types.RevokeInvitationDocument,
    "\n  mutation AcceptInvitationById($id: ID!) {\n    acceptInvitationById(id: $id) {\n      id\n      acceptedAt\n    }\n  }\n": typeof types.AcceptInvitationByIdDocument,
    "\n  mutation DeclineInvitationById($id: ID!) {\n    declineInvitationById(id: $id) {\n      id\n      declinedAt\n    }\n  }\n": typeof types.DeclineInvitationByIdDocument,
    "\n  query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {\n    workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {\n      deductions {\n        before\n        inventoryItemId\n        lowStockThreshold\n        quantity\n        shortfall\n        stepId\n        unit\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n": typeof types.WorkingDeductionPreviewDocument,
    "\n  mutation CompleteWorking($workspaceId: ID!, $id: ID!) {\n    completeWorking(workspaceId: $workspaceId, id: $id) {\n      working {\n        id\n        status\n        completedAt\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n": typeof types.CompleteWorkingDocument,
    "\n  mutation RecordWorking($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {\n    recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n": typeof types.RecordWorkingDocument,
    "\n  mutation UpdateWorking($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {\n    updateWorking(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n": typeof types.UpdateWorkingDocument,
    "\n  query RecordWorkingMembers($workspaceId: ID!, $query: String, $first: Int) {\n    workspace(id: $workspaceId) {\n      id\n      members(first: $first, query: $query) {\n        edges {\n          node {\n            user {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.RecordWorkingMembersDocument,
    "\n  mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {\n    sendSignedOutSupportRequest(input: $input)\n  }\n": typeof types.SendSignedOutSupportRequestDocument,
    "\n  mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {\n    createSpell(workspaceId: $workspaceId, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": typeof types.CreateSpellDocument,
    "\n  mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {\n    updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": typeof types.UpdateSpellDocument,
    "\n  query SpellBuilderReload($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      categories {\n        id\n      }\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": typeof types.SpellBuilderReloadDocument,
    "\n  query SpellIngredientSuggestions(\n    $workspaceId: ID!\n    $query: String\n    $first: Int\n    $categoryIds: [ID!]\n  ) {\n    ingredientSuggestions(\n      workspaceId: $workspaceId\n      query: $query\n      first: $first\n      categoryIds: $categoryIds\n    ) {\n      edges {\n        group\n        node {\n          id\n          name\n          canonicalName\n          retired\n          toxic\n          safetyNotes\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          categories {\n            id\n            name\n          }\n          variants {\n            id\n            form\n            toxic\n            safetyNotes\n            categories {\n              id\n              name\n            }\n            formChoice {\n              group {\n                icon\n              }\n            }\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.SpellIngredientSuggestionsDocument,
    "\n  query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.SpellBuilderStepsDocument,
    "\n  query RecordWorkingSetup($workspaceId: ID!, $spellId: ID!) {\n    spell(id: $spellId, workspaceId: $workspaceId) {\n      id\n      steps {\n        id\n        name\n        form\n        ingredient {\n          id\n        }\n        variant {\n          id\n        }\n      }\n    }\n  }\n": typeof types.RecordWorkingSetupDocument,
    "\n  mutation DeleteSpell($workspaceId: ID!, $id: ID!) {\n    deleteSpell(workspaceId: $workspaceId, id: $id)\n  }\n": typeof types.DeleteSpellDocument,
    "\n  mutation DuplicateSpell($workspaceId: ID!, $id: ID!) {\n    duplicateSpell(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": typeof types.DuplicateSpellDocument,
    "\n  mutation DeleteWorking($workspaceId: ID!, $id: ID!) {\n    deleteWorking(workspaceId: $workspaceId, id: $id)\n  }\n": typeof types.DeleteWorkingDocument,
    "\n  mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {\n    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n": typeof types.SaveStockDocument,
    "\n  query SupportDialogState {\n    supportDialogState {\n      kind\n      until\n    }\n  }\n": typeof types.SupportDialogStateDocument,
    "\n  mutation SendSupportRequest($input: SupportRequestInput!) {\n    sendSupportRequest(input: $input) {\n      id\n    }\n  }\n": typeof types.SendSupportRequestDocument,
    "\n  query SupportRequestByViewToken($token: String!) {\n    supportRequestByViewToken(token: $token) {\n      id\n      about\n      status\n      subject\n      message\n      sentAt\n      replies {\n        id\n        authorRole\n        body\n        sentAt\n      }\n    }\n  }\n": typeof types.SupportRequestByViewTokenDocument,
    "\n  mutation AssignSupportRequest($id: ID!, $assigneeId: ID) {\n    assignSupportRequest(id: $id, assigneeId: $assigneeId) {\n      id\n    }\n  }\n": typeof types.AssignSupportRequestDocument,
    "\n  mutation SetSupportRequestCuratorVisible($id: ID!, $visible: Boolean!) {\n    setSupportRequestCuratorVisible(id: $id, visible: $visible) {\n      id\n    }\n  }\n": typeof types.SetSupportRequestCuratorVisibleDocument,
    "\n  mutation ResolveSupportRequest($id: ID!) {\n    resolveSupportRequest(id: $id) {\n      id\n    }\n  }\n": typeof types.ResolveSupportRequestDocument,
    "\n  mutation SetSupportRequestIssueUrl($id: ID!, $issueUrl: String) {\n    setSupportRequestIssueUrl(id: $id, issueUrl: $issueUrl) {\n      id\n    }\n  }\n": typeof types.SetSupportRequestIssueUrlDocument,
    "\n  mutation ReplyToSupportRequest($requestId: ID!, $body: String!, $waitingOnSender: Boolean) {\n    replyToSupportRequest(requestId: $requestId, body: $body, waitingOnSender: $waitingOnSender) {\n      id\n    }\n  }\n": typeof types.ReplyToSupportRequestDocument,
    "\n  mutation AddSupportInternalNote($requestId: ID!, $body: String!) {\n    addSupportInternalNote(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n": typeof types.AddSupportInternalNoteDocument,
    "\n  mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": typeof types.TimeOutSupportSenderDocument,
    "\n  mutation TimeOutSignedOutSender(\n    $requestId: ID!\n    $until: DateTime\n    $note: String!\n    $message: String!\n  ) {\n    timeOutSignedOutSender(requestId: $requestId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": typeof types.TimeOutSignedOutSenderDocument,
    "\n  mutation LiftSupportTimeout($id: ID!) {\n    liftSupportTimeout(id: $id) {\n      id\n    }\n  }\n": typeof types.LiftSupportTimeoutDocument,
    "\n  mutation SendSupportMessage($requestId: ID!, $body: String!) {\n    sendSupportMessage(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n": typeof types.SendSupportMessageDocument,
    "\n  mutation ResolveMySupportRequest($id: ID!) {\n    resolveMySupportRequest(id: $id) {\n      id\n    }\n  }\n": typeof types.ResolveMySupportRequestDocument,
    "\n  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {\n    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)\n  }\n": typeof types.ReplyToSupportRequestByViewTokenDocument,
    "\n  mutation AgreeToTerms($version: AgreementVersionInput!) {\n    agreeToTerms(version: $version) {\n      id\n      agreedTermsVersion\n      agreedDisclaimerVersion\n      agreedEthicsVersion\n    }\n  }\n": typeof types.AgreeToTermsDocument,
    "\n  mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": typeof types.PauseUserAccessDocument,
    "\n  mutation LiftUserAccessPause($userId: ID!) {\n    liftUserAccessPause(userId: $userId) {\n      id\n    }\n  }\n": typeof types.LiftUserAccessPauseDocument,
    "\n  mutation GrantWorkspaceCreation($userId: ID!, $note: String) {\n    grantWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n": typeof types.GrantWorkspaceCreationDocument,
    "\n  mutation RevokeWorkspaceCreation($userId: ID!, $note: String) {\n    revokeWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n": typeof types.RevokeWorkspaceCreationDocument,
    "\n  mutation PauseAdminRoleChanges {\n    pauseAdminRoleChanges\n  }\n": typeof types.PauseAdminRoleChangesDocument,
    "\n  mutation ResumeAdminRoleChanges {\n    resumeAdminRoleChanges\n  }\n": typeof types.ResumeAdminRoleChangesDocument,
    "\n  mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {\n    setUserRole(userId: $userId, role: $role, note: $note) {\n      id\n      role\n      canCreateWorkspace\n    }\n  }\n": typeof types.SetUserRoleDocument,
};
const documents: Documents = {
    "\n  query CardArrivalsCsv($query: String) {\n    cardArrivalsCsv(query: $query)\n  }\n": types.CardArrivalsCsvDocument,
    "\n  query InvitationCardAttempts($batchId: ID!, $first: Int!, $after: String) {\n    invitationCardAttempts(batchId: $batchId, first: $first, after: $after) {\n      edges {\n        node {\n          id\n          reason\n          attempts\n          cardPosition\n          firstAttemptedAt\n          lastAttemptedAt\n          account {\n            id\n            name\n            email\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.InvitationCardAttemptsDocument,
    "\n  mutation RevokeInvitationCardBatch($batchId: ID!) {\n    revokeInvitationCardBatch(batchId: $batchId) {\n      id\n    }\n  }\n": types.RevokeInvitationCardBatchDocument,
    "\n  mutation CreateInvitationCards(\n    $sheets: Int!\n    $expiresAt: DateTime!\n    $beta: Boolean!\n    $note: String\n  ) {\n    createInvitationCards(sheets: $sheets, expiresAt: $expiresAt, beta: $beta, note: $note) {\n      batchId\n      expiresAt\n      tokens\n    }\n  }\n": types.CreateInvitationCardsDocument,
    "\n  mutation RevokeAdminInvitation($id: ID!) {\n    revokeAdminInvitation(id: $id) {\n      id\n    }\n  }\n": types.RevokeAdminInvitationDocument,
    "\n  mutation CreateAdminInvitation($email: String!, $siteRole: InvitableSiteRole!, $note: String) {\n    createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {\n      id\n    }\n  }\n": types.CreateAdminInvitationDocument,
    "\n  query CompendiumFacetCounts(\n    $query: String\n    $forms: [String!]\n    $withoutReferences: Boolean\n    $withoutForms: Boolean\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $reviewed: Boolean\n    $listing: CompendiumListing\n    $covenIds: [ID!]\n    $covensNot: Boolean\n  ) {\n    compendiumFacets(\n      query: $query\n      forms: $forms\n      withoutReferences: $withoutReferences\n      withoutForms: $withoutForms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      reviewed: $reviewed\n      listing: $listing\n      covenIds: $covenIds\n      covensNot: $covensNot\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      withoutReferences\n      withoutForms\n      reviewed {\n        value\n        count\n      }\n    }\n  }\n": types.CompendiumFacetCountsDocument,
    "\n  query CovenFacetCounts(\n    $workspaceId: ID!\n    $query: String\n    $forms: [String!]\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $source: IngredientSource\n    $inStock: Boolean\n    $lowStockOnly: Boolean\n  ) {\n    workspaceIngredientFacets(\n      workspaceId: $workspaceId\n      query: $query\n      forms: $forms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      source: $source\n      inStock: $inStock\n      lowStockOnly: $lowStockOnly\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      source {\n        value\n        count\n      }\n      inStock\n      lowStockOnly\n    }\n  }\n": types.CovenFacetCountsDocument,
    "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      id\n      name\n      slug\n    }\n  }\n": types.CreateWorkspaceDocument,
    "\n  mutation AnnotateCupboardEntry(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput!\n    $expectedRevision: Int\n  ) {\n    annotateCupboardEntry(\n      workspaceId: $workspaceId\n      ingredientId: $ingredientId\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      revision\n    }\n  }\n": types.AnnotateCupboardEntryDocument,
    "\n  mutation DeleteWorkspace($workspaceId: ID!) {\n    deleteWorkspace(workspaceId: $workspaceId)\n  }\n": types.DeleteWorkspaceDocument,
    "\n  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {\n    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {\n      id\n      revision\n    }\n  }\n": types.SaveDocumentDraftDocument,
    "\n  mutation DiscardDocumentDraft($documentId: ID!, $expectedRevision: Int!) {\n    discardDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision)\n  }\n": types.DiscardDocumentDraftDocument,
    "\n  mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {\n    publishDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision) {\n      number\n    }\n  }\n": types.PublishDocumentDraftDocument,
    "\n  mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {\n    emailDocumentsToEveryAccount(summaries: $summaries) {\n      canSend\n    }\n  }\n": types.EmailDocumentsToEveryAccountDocument,
    "\n  mutation ResumeDocumentMailing($mailingId: ID!) {\n    resumeDocumentMailing(mailingId: $mailingId) {\n      canSend\n    }\n  }\n": types.ResumeDocumentMailingDocument,
    "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n": types.SetEmailDocument,
    "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateCategoryGroupDocument,
    "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateCategoryGroupDocument,
    "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteCategoryGroupDocument,
    "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n": types.CreateIngredientFormGroupDocument,
    "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n": types.UpdateIngredientFormGroupDocument,
    "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteIngredientFormGroupDocument,
    "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateDeityTraditionDocument,
    "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateDeityTraditionDocument,
    "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteDeityTraditionDocument,
    "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateCategoryDocument,
    "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateCategoryDocument,
    "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n": types.DeleteCategoryDocument,
    "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateIngredientFormValueDocument,
    "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateIngredientFormValueDocument,
    "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n": types.DeleteIngredientFormValueDocument,
    "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateDeityDocument,
    "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateDeityDocument,
    "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n": types.DeleteDeityDocument,
    "\n  mutation CreateCelestialBody($input: CelestialBodyInput!) {\n    createCelestialBody(input: $input) {\n      id\n    }\n  }\n": types.CreateCelestialBodyDocument,
    "\n  mutation UpdateCelestialBody($id: ID!, $input: CelestialBodyInput!) {\n    updateCelestialBody(id: $id, input: $input) {\n      id\n    }\n  }\n": types.UpdateCelestialBodyDocument,
    "\n  mutation DeleteCelestialBody($id: ID!) {\n    deleteCelestialBody(id: $id)\n  }\n": types.DeleteCelestialBodyDocument,
    "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n": types.CreateZodiacSignDocument,
    "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n": types.UpdateZodiacSignDocument,
    "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n": types.DeleteZodiacSignDocument,
    "\n  mutation CreateHelpArticle($input: HelpArticleInput!) {\n    createHelpArticle(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateHelpArticleDocument,
    "\n  mutation UpdateHelpArticle($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateHelpArticleDocument,
    "\n  mutation DeleteHelpArticle($id: ID!) {\n    deleteHelpArticle(id: $id)\n  }\n": types.DeleteHelpArticleDocument,
    "\n  mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n    }\n  }\n": types.OrderHelpSubPagesDocument,
    "\n  mutation SetHelpArticleShown($id: ID!, $shown: Boolean!) {\n    setHelpArticleShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n": types.SetHelpArticleShownDocument,
    "\n  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      id\n    }\n  }\n": types.AddCupboardEntryDocument,
    "\n  mutation RemoveCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)\n  }\n": types.RemoveCupboardEntryDocument,
    "\n  mutation MakeItOurs($workspaceId: ID!, $ingredientId: ID!) {\n    convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      entry {\n        id\n      }\n    }\n  }\n": types.MakeItOursDocument,
    "\n  mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n": types.DeleteOwnIngredientDocument,
    "\n  mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {\n    setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {\n      id\n    }\n  }\n": types.SetCompendiumEntryReviewedDocument,
    "\n  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {\n    setCompendiumEntryShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n": types.SetCompendiumEntryShownDocument,
    "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n": types.PickerCategoriesDocument,
    "\n  query CompendiumEntryUsers($id: ID!) {\n    compendiumEntryUsers(id: $id)\n  }\n": types.CompendiumEntryUsersDocument,
    "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n": types.PossibleDuplicatesDocument,
    "\n  query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {\n    compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n": types.CompendiumMatchesDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n      revision\n      stock(workspaceId: $workspaceId) {\n        quantityOnHand\n        unit\n        variant {\n          form\n        }\n      }\n    }\n  }\n": types.CreateWorkspaceIngredientDocument,
    "\n  mutation UpdateWorkspaceIngredient(\n    $workspaceId: ID!\n    $id: ID!\n    $input: IngredientUpdateInput!\n    $expectedRevision: Int\n  ) {\n    updateIngredient(\n      workspaceId: $workspaceId\n      id: $id\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": types.UpdateWorkspaceIngredientDocument,
    "\n  mutation AddCupboardEntryFromForm(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput\n  ) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n": types.AddCupboardEntryFromFormDocument,
    "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": types.CreateCompendiumIngredientDocument,
    "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n    $expectedRevision: Int\n  ) {\n    updateCompendiumIngredient(\n      id: $id\n      input: $input\n      endRedirect: $endRedirect\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n": types.UpdateCompendiumIngredientDocument,
    "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n": types.DeleteCompendiumIngredientDocument,
    "\n  mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n": types.DeleteWorkspaceIngredientDocument,
    "\n  mutation PromoteFolkName($workspaceId: ID, $id: ID!, $folkNameId: ID!) {\n    promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) {\n      id\n      name\n      slug\n      folkNames {\n        id\n        name\n      }\n    }\n  }\n": types.PromoteFolkNameDocument,
    "\n  query DuplicateQuickLook($id: ID!, $workspaceId: ID!) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      nomenclature\n      description\n      safetyNotes\n      toxic\n      isGlobal\n      retired\n      reviewedAt\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      audit {\n        createdAt\n        updatedAt\n      }\n      cupboardEntry(workspaceId: $workspaceId) {\n        label\n        description\n        safetyNotes\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n      folkNames {\n        name\n      }\n      categories {\n        id\n        name\n        slug\n        group {\n          id\n          name\n          colorDark\n          colorLight\n        }\n      }\n      deities {\n        name\n        deity {\n          otherNames\n          tradition {\n            name\n          }\n        }\n      }\n      variants {\n        id\n        form\n        safetyNotes\n        toxic\n        formChoice {\n          group {\n            icon\n          }\n        }\n      }\n      stock(workspaceId: $workspaceId) {\n        id\n        variant {\n          id\n        }\n        quantityOnHand\n        unit\n        lowStockThreshold\n      }\n    }\n  }\n": types.DuplicateQuickLookDocument,
    "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n": types.CreateReferenceDocument,
    "\n  mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {\n    updateReference(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n": types.UpdateReferenceDocument,
    "\n  query Reference($workspaceId: ID, $id: ID!) {\n    reference(workspaceId: $workspaceId, id: $id) {\n      id\n      kind\n      title\n      authors\n      container\n      contributors\n      edition\n      volume\n      issue\n      series\n      place\n      publisher\n      published\n      pages\n      host\n      url\n      modified\n      accessed\n      note\n      scholarly\n    }\n  }\n": types.ReferenceDocument,
    "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n          kind\n          authors\n          title\n          container\n        }\n      }\n    }\n  }\n": types.ReferenceSuggestionsDocument,
    "\n  query IngredientSummary($id: ID!, $workspaceId: ID) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      description\n      nomenclature\n      isGlobal\n      slug\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      variants {\n        id\n        form\n        formChoice {\n          group {\n            icon\n          }\n        }\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n    }\n  }\n": types.IngredientSummaryDocument,
    "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          icon\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.CommonNameSuggestionsDocument,
    "\n  query CelestialBodySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    celestialBodySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": types.CelestialBodySuggestionsDocument,
    "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": types.ZodiacSuggestionsDocument,
    "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          matchedName\n          curated\n        }\n      }\n    }\n  }\n": types.DeitySuggestionsDocument,
    "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        group\n        node {\n          id\n          name\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": types.IngredientSuggestionsDocument,
    "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": types.CompendiumSubstitutesDocument,
    "\n  query IngredientSearchMatches($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n        }\n      }\n    }\n  }\n": types.IngredientSearchMatchesDocument,
    "\n  query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {\n    workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n        }\n      }\n    }\n  }\n": types.IngredientSearchCupboardMatchesDocument,
    "\n  query GrimoireSearchMatches(\n    $workspaceId: ID!\n    $query: String\n    $status: SpellStatus\n    $first: Int\n  ) {\n    grimoire(workspaceId: $workspaceId, query: $query, status: $status, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          title\n        }\n      }\n    }\n  }\n": types.GrimoireSearchMatchesDocument,
    "\n  mutation AcceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n    }\n  }\n": types.AcceptInvitationDocument,
    "\n  mutation RecordCardAttempt($token: String!) {\n    recordCardAttempt(token: $token)\n  }\n": types.RecordCardAttemptDocument,
    "\n  mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {\n    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {\n      id\n    }\n  }\n": types.CreateInvitationDocument,
    "\n  mutation LeaveWorkspace($workspaceId: ID!) {\n    leaveWorkspace(workspaceId: $workspaceId)\n  }\n": types.LeaveWorkspaceDocument,
    "\n  mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n    }\n  }\n": types.PromoteSuccessorDocument,
    "\n  mutation PauseMemberAccess(\n    $workspaceId: ID!\n    $userId: ID!\n    $until: DateTime\n    $note: String\n    $message: String\n  ) {\n    pauseMemberAccess(\n      workspaceId: $workspaceId\n      userId: $userId\n      until: $until\n      note: $note\n      message: $message\n    ) {\n      id\n    }\n  }\n": types.PauseMemberAccessDocument,
    "\n  mutation LiftMemberAccessPause($workspaceId: ID!, $userId: ID!) {\n    liftMemberAccessPause(workspaceId: $workspaceId, userId: $userId) {\n      id\n    }\n  }\n": types.LiftMemberAccessPauseDocument,
    "\n  query MemberPauses($workspaceId: ID!, $userId: ID!) {\n    workspace(id: $workspaceId) {\n      id\n      memberPauses(userId: $userId, first: 25) {\n        edges {\n          node {\n            id\n            until\n            note\n            liftedAt\n            audit {\n              createdAt\n            }\n            setBy {\n              id\n              name\n            }\n            liftedBy {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": types.MemberPausesDocument,
    "\n  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {\n    removeMember(workspaceId: $workspaceId, userId: $userId)\n  }\n": types.RemoveMemberDocument,
    "\n  mutation UpdateMemberRole($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n      user {\n        id\n      }\n    }\n  }\n": types.UpdateMemberRoleDocument,
    "\n  mutation SetName($name: String!) {\n    setName(name: $name) {\n      id\n      name\n    }\n  }\n": types.SetNameDocument,
    "\n  mutation SetPassword($newPassword: String!) {\n    setPassword(newPassword: $newPassword)\n  }\n": types.SetPasswordDocument,
    "\n  mutation RemoveDeclinedInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": types.RemoveDeclinedInvitationDocument,
    "\n  mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": types.RevokeInvitationDocument,
    "\n  mutation AcceptInvitationById($id: ID!) {\n    acceptInvitationById(id: $id) {\n      id\n      acceptedAt\n    }\n  }\n": types.AcceptInvitationByIdDocument,
    "\n  mutation DeclineInvitationById($id: ID!) {\n    declineInvitationById(id: $id) {\n      id\n      declinedAt\n    }\n  }\n": types.DeclineInvitationByIdDocument,
    "\n  query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {\n    workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {\n      deductions {\n        before\n        inventoryItemId\n        lowStockThreshold\n        quantity\n        shortfall\n        stepId\n        unit\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n": types.WorkingDeductionPreviewDocument,
    "\n  mutation CompleteWorking($workspaceId: ID!, $id: ID!) {\n    completeWorking(workspaceId: $workspaceId, id: $id) {\n      working {\n        id\n        status\n        completedAt\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n": types.CompleteWorkingDocument,
    "\n  mutation RecordWorking($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {\n    recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n": types.RecordWorkingDocument,
    "\n  mutation UpdateWorking($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {\n    updateWorking(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n": types.UpdateWorkingDocument,
    "\n  query RecordWorkingMembers($workspaceId: ID!, $query: String, $first: Int) {\n    workspace(id: $workspaceId) {\n      id\n      members(first: $first, query: $query) {\n        edges {\n          node {\n            user {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": types.RecordWorkingMembersDocument,
    "\n  mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {\n    sendSignedOutSupportRequest(input: $input)\n  }\n": types.SendSignedOutSupportRequestDocument,
    "\n  mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {\n    createSpell(workspaceId: $workspaceId, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": types.CreateSpellDocument,
    "\n  mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {\n    updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": types.UpdateSpellDocument,
    "\n  query SpellBuilderReload($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      categories {\n        id\n      }\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n": types.SpellBuilderReloadDocument,
    "\n  query SpellIngredientSuggestions(\n    $workspaceId: ID!\n    $query: String\n    $first: Int\n    $categoryIds: [ID!]\n  ) {\n    ingredientSuggestions(\n      workspaceId: $workspaceId\n      query: $query\n      first: $first\n      categoryIds: $categoryIds\n    ) {\n      edges {\n        group\n        node {\n          id\n          name\n          canonicalName\n          retired\n          toxic\n          safetyNotes\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          categories {\n            id\n            name\n          }\n          variants {\n            id\n            form\n            toxic\n            safetyNotes\n            categories {\n              id\n              name\n            }\n            formChoice {\n              group {\n                icon\n              }\n            }\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n": types.SpellIngredientSuggestionsDocument,
    "\n  query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n    }\n  }\n": types.SpellBuilderStepsDocument,
    "\n  query RecordWorkingSetup($workspaceId: ID!, $spellId: ID!) {\n    spell(id: $spellId, workspaceId: $workspaceId) {\n      id\n      steps {\n        id\n        name\n        form\n        ingredient {\n          id\n        }\n        variant {\n          id\n        }\n      }\n    }\n  }\n": types.RecordWorkingSetupDocument,
    "\n  mutation DeleteSpell($workspaceId: ID!, $id: ID!) {\n    deleteSpell(workspaceId: $workspaceId, id: $id)\n  }\n": types.DeleteSpellDocument,
    "\n  mutation DuplicateSpell($workspaceId: ID!, $id: ID!) {\n    duplicateSpell(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n": types.DuplicateSpellDocument,
    "\n  mutation DeleteWorking($workspaceId: ID!, $id: ID!) {\n    deleteWorking(workspaceId: $workspaceId, id: $id)\n  }\n": types.DeleteWorkingDocument,
    "\n  mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {\n    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n": types.SaveStockDocument,
    "\n  query SupportDialogState {\n    supportDialogState {\n      kind\n      until\n    }\n  }\n": types.SupportDialogStateDocument,
    "\n  mutation SendSupportRequest($input: SupportRequestInput!) {\n    sendSupportRequest(input: $input) {\n      id\n    }\n  }\n": types.SendSupportRequestDocument,
    "\n  query SupportRequestByViewToken($token: String!) {\n    supportRequestByViewToken(token: $token) {\n      id\n      about\n      status\n      subject\n      message\n      sentAt\n      replies {\n        id\n        authorRole\n        body\n        sentAt\n      }\n    }\n  }\n": types.SupportRequestByViewTokenDocument,
    "\n  mutation AssignSupportRequest($id: ID!, $assigneeId: ID) {\n    assignSupportRequest(id: $id, assigneeId: $assigneeId) {\n      id\n    }\n  }\n": types.AssignSupportRequestDocument,
    "\n  mutation SetSupportRequestCuratorVisible($id: ID!, $visible: Boolean!) {\n    setSupportRequestCuratorVisible(id: $id, visible: $visible) {\n      id\n    }\n  }\n": types.SetSupportRequestCuratorVisibleDocument,
    "\n  mutation ResolveSupportRequest($id: ID!) {\n    resolveSupportRequest(id: $id) {\n      id\n    }\n  }\n": types.ResolveSupportRequestDocument,
    "\n  mutation SetSupportRequestIssueUrl($id: ID!, $issueUrl: String) {\n    setSupportRequestIssueUrl(id: $id, issueUrl: $issueUrl) {\n      id\n    }\n  }\n": types.SetSupportRequestIssueUrlDocument,
    "\n  mutation ReplyToSupportRequest($requestId: ID!, $body: String!, $waitingOnSender: Boolean) {\n    replyToSupportRequest(requestId: $requestId, body: $body, waitingOnSender: $waitingOnSender) {\n      id\n    }\n  }\n": types.ReplyToSupportRequestDocument,
    "\n  mutation AddSupportInternalNote($requestId: ID!, $body: String!) {\n    addSupportInternalNote(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n": types.AddSupportInternalNoteDocument,
    "\n  mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": types.TimeOutSupportSenderDocument,
    "\n  mutation TimeOutSignedOutSender(\n    $requestId: ID!\n    $until: DateTime\n    $note: String!\n    $message: String!\n  ) {\n    timeOutSignedOutSender(requestId: $requestId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": types.TimeOutSignedOutSenderDocument,
    "\n  mutation LiftSupportTimeout($id: ID!) {\n    liftSupportTimeout(id: $id) {\n      id\n    }\n  }\n": types.LiftSupportTimeoutDocument,
    "\n  mutation SendSupportMessage($requestId: ID!, $body: String!) {\n    sendSupportMessage(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n": types.SendSupportMessageDocument,
    "\n  mutation ResolveMySupportRequest($id: ID!) {\n    resolveMySupportRequest(id: $id) {\n      id\n    }\n  }\n": types.ResolveMySupportRequestDocument,
    "\n  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {\n    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)\n  }\n": types.ReplyToSupportRequestByViewTokenDocument,
    "\n  mutation AgreeToTerms($version: AgreementVersionInput!) {\n    agreeToTerms(version: $version) {\n      id\n      agreedTermsVersion\n      agreedDisclaimerVersion\n      agreedEthicsVersion\n    }\n  }\n": types.AgreeToTermsDocument,
    "\n  mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n": types.PauseUserAccessDocument,
    "\n  mutation LiftUserAccessPause($userId: ID!) {\n    liftUserAccessPause(userId: $userId) {\n      id\n    }\n  }\n": types.LiftUserAccessPauseDocument,
    "\n  mutation GrantWorkspaceCreation($userId: ID!, $note: String) {\n    grantWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n": types.GrantWorkspaceCreationDocument,
    "\n  mutation RevokeWorkspaceCreation($userId: ID!, $note: String) {\n    revokeWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n": types.RevokeWorkspaceCreationDocument,
    "\n  mutation PauseAdminRoleChanges {\n    pauseAdminRoleChanges\n  }\n": types.PauseAdminRoleChangesDocument,
    "\n  mutation ResumeAdminRoleChanges {\n    resumeAdminRoleChanges\n  }\n": types.ResumeAdminRoleChangesDocument,
    "\n  mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {\n    setUserRole(userId: $userId, role: $role, note: $note) {\n      id\n      role\n      canCreateWorkspace\n    }\n  }\n": types.SetUserRoleDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CardArrivalsCsv($query: String) {\n    cardArrivalsCsv(query: $query)\n  }\n"): typeof import('./graphql').CardArrivalsCsvDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query InvitationCardAttempts($batchId: ID!, $first: Int!, $after: String) {\n    invitationCardAttempts(batchId: $batchId, first: $first, after: $after) {\n      edges {\n        node {\n          id\n          reason\n          attempts\n          cardPosition\n          firstAttemptedAt\n          lastAttemptedAt\n          account {\n            id\n            name\n            email\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').InvitationCardAttemptsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeInvitationCardBatch($batchId: ID!) {\n    revokeInvitationCardBatch(batchId: $batchId) {\n      id\n    }\n  }\n"): typeof import('./graphql').RevokeInvitationCardBatchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateInvitationCards(\n    $sheets: Int!\n    $expiresAt: DateTime!\n    $beta: Boolean!\n    $note: String\n  ) {\n    createInvitationCards(sheets: $sheets, expiresAt: $expiresAt, beta: $beta, note: $note) {\n      batchId\n      expiresAt\n      tokens\n    }\n  }\n"): typeof import('./graphql').CreateInvitationCardsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeAdminInvitation($id: ID!) {\n    revokeAdminInvitation(id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').RevokeAdminInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAdminInvitation($email: String!, $siteRole: InvitableSiteRole!, $note: String) {\n    createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {\n      id\n    }\n  }\n"): typeof import('./graphql').CreateAdminInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompendiumFacetCounts(\n    $query: String\n    $forms: [String!]\n    $withoutReferences: Boolean\n    $withoutForms: Boolean\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $reviewed: Boolean\n    $listing: CompendiumListing\n    $covenIds: [ID!]\n    $covensNot: Boolean\n  ) {\n    compendiumFacets(\n      query: $query\n      forms: $forms\n      withoutReferences: $withoutReferences\n      withoutForms: $withoutForms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      reviewed: $reviewed\n      listing: $listing\n      covenIds: $covenIds\n      covensNot: $covensNot\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      withoutReferences\n      withoutForms\n      reviewed {\n        value\n        count\n      }\n    }\n  }\n"): typeof import('./graphql').CompendiumFacetCountsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CovenFacetCounts(\n    $workspaceId: ID!\n    $query: String\n    $forms: [String!]\n    $elements: [IngredientElement!]\n    $categoryIds: [ID!]\n    $categoryMode: CategoryMode\n    $deityIds: [ID!]\n    $zodiacSigns: [String!]\n    $celestialBodies: [String!]\n    $toxic: ToxicFilter\n    $source: IngredientSource\n    $inStock: Boolean\n    $lowStockOnly: Boolean\n  ) {\n    workspaceIngredientFacets(\n      workspaceId: $workspaceId\n      query: $query\n      forms: $forms\n      elements: $elements\n      categoryIds: $categoryIds\n      categoryMode: $categoryMode\n      deityIds: $deityIds\n      zodiacSigns: $zodiacSigns\n      celestialBodies: $celestialBodies\n      toxic: $toxic\n      source: $source\n      inStock: $inStock\n      lowStockOnly: $lowStockOnly\n    ) {\n      forms {\n        value\n        count\n      }\n      deities {\n        value\n        count\n      }\n      categories {\n        value\n        count\n      }\n      zodiacSigns {\n        value\n        count\n      }\n      celestialBodies {\n        value\n        count\n      }\n      elements {\n        value\n        count\n      }\n      toxic {\n        value\n        count\n      }\n      source {\n        value\n        count\n      }\n      inStock\n      lowStockOnly\n    }\n  }\n"): typeof import('./graphql').CovenFacetCountsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      id\n      name\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateWorkspaceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AnnotateCupboardEntry(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput!\n    $expectedRevision: Int\n  ) {\n    annotateCupboardEntry(\n      workspaceId: $workspaceId\n      ingredientId: $ingredientId\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      revision\n    }\n  }\n"): typeof import('./graphql').AnnotateCupboardEntryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkspace($workspaceId: ID!) {\n    deleteWorkspace(workspaceId: $workspaceId)\n  }\n"): typeof import('./graphql').DeleteWorkspaceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {\n    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {\n      id\n      revision\n    }\n  }\n"): typeof import('./graphql').SaveDocumentDraftDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DiscardDocumentDraft($documentId: ID!, $expectedRevision: Int!) {\n    discardDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision)\n  }\n"): typeof import('./graphql').DiscardDocumentDraftDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {\n    publishDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision) {\n      number\n    }\n  }\n"): typeof import('./graphql').PublishDocumentDraftDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {\n    emailDocumentsToEveryAccount(summaries: $summaries) {\n      canSend\n    }\n  }\n"): typeof import('./graphql').EmailDocumentsToEveryAccountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResumeDocumentMailing($mailingId: ID!) {\n    resumeDocumentMailing(mailingId: $mailingId) {\n      canSend\n    }\n  }\n"): typeof import('./graphql').ResumeDocumentMailingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n"): typeof import('./graphql').SetEmailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateCategoryGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateCategoryGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n"): typeof import('./graphql').DeleteCategoryGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n"): typeof import('./graphql').CreateIngredientFormGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n      icon\n    }\n  }\n"): typeof import('./graphql').UpdateIngredientFormGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n"): typeof import('./graphql').DeleteIngredientFormGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateDeityTraditionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateDeityTraditionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n"): typeof import('./graphql').DeleteDeityTraditionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateCategoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateCategoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n"): typeof import('./graphql').DeleteCategoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateIngredientFormValueDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateIngredientFormValueDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n"): typeof import('./graphql').DeleteIngredientFormValueDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateDeityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateDeityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n"): typeof import('./graphql').DeleteDeityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCelestialBody($input: CelestialBodyInput!) {\n    createCelestialBody(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').CreateCelestialBodyDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCelestialBody($id: ID!, $input: CelestialBodyInput!) {\n    updateCelestialBody(id: $id, input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').UpdateCelestialBodyDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCelestialBody($id: ID!) {\n    deleteCelestialBody(id: $id)\n  }\n"): typeof import('./graphql').DeleteCelestialBodyDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').CreateZodiacSignDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').UpdateZodiacSignDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n"): typeof import('./graphql').DeleteZodiacSignDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateHelpArticle($input: HelpArticleInput!) {\n    createHelpArticle(input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').CreateHelpArticleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateHelpArticle($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): typeof import('./graphql').UpdateHelpArticleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteHelpArticle($id: ID!) {\n    deleteHelpArticle(id: $id)\n  }\n"): typeof import('./graphql').DeleteHelpArticleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {\n    updateHelpArticle(id: $id, input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').OrderHelpSubPagesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetHelpArticleShown($id: ID!, $shown: Boolean!) {\n    setHelpArticleShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n"): typeof import('./graphql').SetHelpArticleShownDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      id\n    }\n  }\n"): typeof import('./graphql').AddCupboardEntryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {\n    removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)\n  }\n"): typeof import('./graphql').RemoveCupboardEntryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MakeItOurs($workspaceId: ID!, $ingredientId: ID!) {\n    convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {\n      entry {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').MakeItOursDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n"): typeof import('./graphql').DeleteOwnIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {\n    setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {\n      id\n    }\n  }\n"): typeof import('./graphql').SetCompendiumEntryReviewedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {\n    setCompendiumEntryShown(id: $id, shown: $shown) {\n      id\n    }\n  }\n"): typeof import('./graphql').SetCompendiumEntryShownDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').PickerCategoriesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompendiumEntryUsers($id: ID!) {\n    compendiumEntryUsers(id: $id)\n  }\n"): typeof import('./graphql').CompendiumEntryUsersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').PossibleDuplicatesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {\n    compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          nomenclature\n          slug\n          isGlobal\n          inCupboard(workspaceId: $workspaceId)\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CompendiumMatchesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n      revision\n      stock(workspaceId: $workspaceId) {\n        quantityOnHand\n        unit\n        variant {\n          form\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CreateWorkspaceIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorkspaceIngredient(\n    $workspaceId: ID!\n    $id: ID!\n    $input: IngredientUpdateInput!\n    $expectedRevision: Int\n  ) {\n    updateIngredient(\n      workspaceId: $workspaceId\n      id: $id\n      input: $input\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n"): typeof import('./graphql').UpdateWorkspaceIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddCupboardEntryFromForm(\n    $workspaceId: ID!\n    $ingredientId: ID!\n    $input: CupboardEntryInput\n  ) {\n    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').AddCupboardEntryFromFormDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n"): typeof import('./graphql').CreateCompendiumIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n    $expectedRevision: Int\n  ) {\n    updateCompendiumIngredient(\n      id: $id\n      input: $input\n      endRedirect: $endRedirect\n      expectedRevision: $expectedRevision\n    ) {\n      id\n      name\n      slug\n      revision\n    }\n  }\n"): typeof import('./graphql').UpdateCompendiumIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n"): typeof import('./graphql').DeleteCompendiumIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkspaceIngredient($id: ID!, $workspaceId: ID!) {\n    deleteIngredient(id: $id, workspaceId: $workspaceId)\n  }\n"): typeof import('./graphql').DeleteWorkspaceIngredientDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PromoteFolkName($workspaceId: ID, $id: ID!, $folkNameId: ID!) {\n    promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) {\n      id\n      name\n      slug\n      folkNames {\n        id\n        name\n      }\n    }\n  }\n"): typeof import('./graphql').PromoteFolkNameDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DuplicateQuickLook($id: ID!, $workspaceId: ID!) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      nomenclature\n      description\n      safetyNotes\n      toxic\n      isGlobal\n      retired\n      reviewedAt\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      audit {\n        createdAt\n        updatedAt\n      }\n      cupboardEntry(workspaceId: $workspaceId) {\n        label\n        description\n        safetyNotes\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n      folkNames {\n        name\n      }\n      categories {\n        id\n        name\n        slug\n        group {\n          id\n          name\n          colorDark\n          colorLight\n        }\n      }\n      deities {\n        name\n        deity {\n          otherNames\n          tradition {\n            name\n          }\n        }\n      }\n      variants {\n        id\n        form\n        safetyNotes\n        toxic\n        formChoice {\n          group {\n            icon\n          }\n        }\n      }\n      stock(workspaceId: $workspaceId) {\n        id\n        variant {\n          id\n        }\n        quantityOnHand\n        unit\n        lowStockThreshold\n      }\n    }\n  }\n"): typeof import('./graphql').DuplicateQuickLookDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n"): typeof import('./graphql').CreateReferenceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateReference($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {\n    updateReference(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      citation\n      isGlobal\n      kind\n      authors\n      title\n      container\n    }\n  }\n"): typeof import('./graphql').UpdateReferenceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Reference($workspaceId: ID, $id: ID!) {\n    reference(workspaceId: $workspaceId, id: $id) {\n      id\n      kind\n      title\n      authors\n      container\n      contributors\n      edition\n      volume\n      issue\n      series\n      place\n      publisher\n      published\n      pages\n      host\n      url\n      modified\n      accessed\n      note\n      scholarly\n    }\n  }\n"): typeof import('./graphql').ReferenceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n          kind\n          authors\n          title\n          container\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').ReferenceSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IngredientSummary($id: ID!, $workspaceId: ID) {\n    ingredient(id: $id, workspaceId: $workspaceId) {\n      id\n      name\n      canonicalName\n      description\n      nomenclature\n      isGlobal\n      slug\n      elements\n      celestialBodies\n      zodiacSigns\n      colors\n      variants {\n        id\n        form\n        formChoice {\n          group {\n            icon\n          }\n        }\n        elements\n        celestialBodies\n        zodiacSigns\n        colors\n      }\n    }\n  }\n"): typeof import('./graphql').IngredientSummaryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          icon\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').FormSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CommonNameSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CelestialBodySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    celestialBodySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CelestialBodySuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').ZodiacSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          matchedName\n          curated\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').DeitySuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        group\n        node {\n          id\n          name\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').IngredientSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          description\n          isGlobal\n          variants {\n            id\n            form\n            formChoice {\n              id\n              group {\n                id\n                name\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CompendiumSubstitutesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IngredientSearchMatches($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').IngredientSearchMatchesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {\n    workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          slug\n          name\n          canonicalName\n          nomenclature\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').IngredientSearchCupboardMatchesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GrimoireSearchMatches(\n    $workspaceId: ID!\n    $query: String\n    $status: SpellStatus\n    $first: Int\n  ) {\n    grimoire(workspaceId: $workspaceId, query: $query, status: $status, first: $first) {\n      pageInfo {\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          title\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').GrimoireSearchMatchesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AcceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n    }\n  }\n"): typeof import('./graphql').AcceptInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RecordCardAttempt($token: String!) {\n    recordCardAttempt(token: $token)\n  }\n"): typeof import('./graphql').RecordCardAttemptDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {\n    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {\n      id\n    }\n  }\n"): typeof import('./graphql').CreateInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LeaveWorkspace($workspaceId: ID!) {\n    leaveWorkspace(workspaceId: $workspaceId)\n  }\n"): typeof import('./graphql').LeaveWorkspaceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n    }\n  }\n"): typeof import('./graphql').PromoteSuccessorDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PauseMemberAccess(\n    $workspaceId: ID!\n    $userId: ID!\n    $until: DateTime\n    $note: String\n    $message: String\n  ) {\n    pauseMemberAccess(\n      workspaceId: $workspaceId\n      userId: $userId\n      until: $until\n      note: $note\n      message: $message\n    ) {\n      id\n    }\n  }\n"): typeof import('./graphql').PauseMemberAccessDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LiftMemberAccessPause($workspaceId: ID!, $userId: ID!) {\n    liftMemberAccessPause(workspaceId: $workspaceId, userId: $userId) {\n      id\n    }\n  }\n"): typeof import('./graphql').LiftMemberAccessPauseDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MemberPauses($workspaceId: ID!, $userId: ID!) {\n    workspace(id: $workspaceId) {\n      id\n      memberPauses(userId: $userId, first: 25) {\n        edges {\n          node {\n            id\n            until\n            note\n            liftedAt\n            audit {\n              createdAt\n            }\n            setBy {\n              id\n              name\n            }\n            liftedBy {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').MemberPausesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {\n    removeMember(workspaceId: $workspaceId, userId: $userId)\n  }\n"): typeof import('./graphql').RemoveMemberDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateMemberRole($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {\n    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {\n      role\n      user {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').UpdateMemberRoleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetName($name: String!) {\n    setName(name: $name) {\n      id\n      name\n    }\n  }\n"): typeof import('./graphql').SetNameDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetPassword($newPassword: String!) {\n    setPassword(newPassword: $newPassword)\n  }\n"): typeof import('./graphql').SetPasswordDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveDeclinedInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').RemoveDeclinedInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {\n    revokeInvitation(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').RevokeInvitationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AcceptInvitationById($id: ID!) {\n    acceptInvitationById(id: $id) {\n      id\n      acceptedAt\n    }\n  }\n"): typeof import('./graphql').AcceptInvitationByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeclineInvitationById($id: ID!) {\n    declineInvitationById(id: $id) {\n      id\n      declinedAt\n    }\n  }\n"): typeof import('./graphql').DeclineInvitationByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {\n    workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {\n      deductions {\n        before\n        inventoryItemId\n        lowStockThreshold\n        quantity\n        shortfall\n        stepId\n        unit\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n"): typeof import('./graphql').WorkingDeductionPreviewDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CompleteWorking($workspaceId: ID!, $id: ID!) {\n    completeWorking(workspaceId: $workspaceId, id: $id) {\n      working {\n        id\n        status\n        completedAt\n      }\n      warnings {\n        position\n        reason\n        stepId\n        stepName\n      }\n    }\n  }\n"): typeof import('./graphql').CompleteWorkingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RecordWorking($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {\n    recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n"): typeof import('./graphql').RecordWorkingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorking($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {\n    updateWorking(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      status\n      note\n      workedOn\n      visibility\n      participants {\n        id\n        name\n        userId\n      }\n    }\n  }\n"): typeof import('./graphql').UpdateWorkingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RecordWorkingMembers($workspaceId: ID!, $query: String, $first: Int) {\n    workspace(id: $workspaceId) {\n      id\n      members(first: $first, query: $query) {\n        edges {\n          node {\n            user {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RecordWorkingMembersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {\n    sendSignedOutSupportRequest(input: $input)\n  }\n"): typeof import('./graphql').SendSignedOutSupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {\n    createSpell(workspaceId: $workspaceId, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n"): typeof import('./graphql').CreateSpellDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {\n    updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n"): typeof import('./graphql').UpdateSpellDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SpellBuilderReload($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      revision\n      title\n      intent\n      jarDescription\n      sealWaxColor\n      moonPhase\n      dayOfWeek\n      note\n      categories {\n        id\n      }\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n      visibility\n      status\n    }\n  }\n"): typeof import('./graphql').SpellBuilderReloadDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SpellIngredientSuggestions(\n    $workspaceId: ID!\n    $query: String\n    $first: Int\n    $categoryIds: [ID!]\n  ) {\n    ingredientSuggestions(\n      workspaceId: $workspaceId\n      query: $query\n      first: $first\n      categoryIds: $categoryIds\n    ) {\n      edges {\n        group\n        node {\n          id\n          name\n          canonicalName\n          retired\n          toxic\n          safetyNotes\n          cupboardEntry(workspaceId: $workspaceId) {\n            label\n          }\n          categories {\n            id\n            name\n          }\n          variants {\n            id\n            form\n            toxic\n            safetyNotes\n            categories {\n              id\n              name\n            }\n            formChoice {\n              group {\n                icon\n              }\n            }\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SpellIngredientSuggestionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {\n    spell(workspaceId: $workspaceId, id: $id) {\n      id\n      steps {\n        id\n        name\n        form\n        quantity\n        unit\n        body\n        ingredient {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          stock(workspaceId: $workspaceId) {\n            unit\n            quantityOnHand\n            lowStockThreshold\n            variant {\n              id\n            }\n          }\n        }\n        variant {\n          id\n          toxic\n          safetyNotes\n          categories {\n            id\n            name\n          }\n          formChoice {\n            group {\n              icon\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SpellBuilderStepsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RecordWorkingSetup($workspaceId: ID!, $spellId: ID!) {\n    spell(id: $spellId, workspaceId: $workspaceId) {\n      id\n      steps {\n        id\n        name\n        form\n        ingredient {\n          id\n        }\n        variant {\n          id\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RecordWorkingSetupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteSpell($workspaceId: ID!, $id: ID!) {\n    deleteSpell(workspaceId: $workspaceId, id: $id)\n  }\n"): typeof import('./graphql').DeleteSpellDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DuplicateSpell($workspaceId: ID!, $id: ID!) {\n    duplicateSpell(workspaceId: $workspaceId, id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').DuplicateSpellDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorking($workspaceId: ID!, $id: ID!) {\n    deleteWorking(workspaceId: $workspaceId, id: $id)\n  }\n"): typeof import('./graphql').DeleteWorkingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {\n    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SaveStockDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SupportDialogState {\n    supportDialogState {\n      kind\n      until\n    }\n  }\n"): typeof import('./graphql').SupportDialogStateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendSupportRequest($input: SupportRequestInput!) {\n    sendSupportRequest(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SendSupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SupportRequestByViewToken($token: String!) {\n    supportRequestByViewToken(token: $token) {\n      id\n      about\n      status\n      subject\n      message\n      sentAt\n      replies {\n        id\n        authorRole\n        body\n        sentAt\n      }\n    }\n  }\n"): typeof import('./graphql').SupportRequestByViewTokenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AssignSupportRequest($id: ID!, $assigneeId: ID) {\n    assignSupportRequest(id: $id, assigneeId: $assigneeId) {\n      id\n    }\n  }\n"): typeof import('./graphql').AssignSupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetSupportRequestCuratorVisible($id: ID!, $visible: Boolean!) {\n    setSupportRequestCuratorVisible(id: $id, visible: $visible) {\n      id\n    }\n  }\n"): typeof import('./graphql').SetSupportRequestCuratorVisibleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResolveSupportRequest($id: ID!) {\n    resolveSupportRequest(id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').ResolveSupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetSupportRequestIssueUrl($id: ID!, $issueUrl: String) {\n    setSupportRequestIssueUrl(id: $id, issueUrl: $issueUrl) {\n      id\n    }\n  }\n"): typeof import('./graphql').SetSupportRequestIssueUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReplyToSupportRequest($requestId: ID!, $body: String!, $waitingOnSender: Boolean) {\n    replyToSupportRequest(requestId: $requestId, body: $body, waitingOnSender: $waitingOnSender) {\n      id\n    }\n  }\n"): typeof import('./graphql').ReplyToSupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddSupportInternalNote($requestId: ID!, $body: String!) {\n    addSupportInternalNote(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n"): typeof import('./graphql').AddSupportInternalNoteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TimeOutSupportSender($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n"): typeof import('./graphql').TimeOutSupportSenderDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TimeOutSignedOutSender(\n    $requestId: ID!\n    $until: DateTime\n    $note: String!\n    $message: String!\n  ) {\n    timeOutSignedOutSender(requestId: $requestId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n"): typeof import('./graphql').TimeOutSignedOutSenderDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LiftSupportTimeout($id: ID!) {\n    liftSupportTimeout(id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').LiftSupportTimeoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendSupportMessage($requestId: ID!, $body: String!) {\n    sendSupportMessage(requestId: $requestId, body: $body) {\n      id\n    }\n  }\n"): typeof import('./graphql').SendSupportMessageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResolveMySupportRequest($id: ID!) {\n    resolveMySupportRequest(id: $id) {\n      id\n    }\n  }\n"): typeof import('./graphql').ResolveMySupportRequestDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {\n    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)\n  }\n"): typeof import('./graphql').ReplyToSupportRequestByViewTokenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AgreeToTerms($version: AgreementVersionInput!) {\n    agreeToTerms(version: $version) {\n      id\n      agreedTermsVersion\n      agreedDisclaimerVersion\n      agreedEthicsVersion\n    }\n  }\n"): typeof import('./graphql').AgreeToTermsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PauseUserAccess($userId: ID!, $until: DateTime, $note: String!, $message: String!) {\n    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {\n      id\n    }\n  }\n"): typeof import('./graphql').PauseUserAccessDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LiftUserAccessPause($userId: ID!) {\n    liftUserAccessPause(userId: $userId) {\n      id\n    }\n  }\n"): typeof import('./graphql').LiftUserAccessPauseDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation GrantWorkspaceCreation($userId: ID!, $note: String) {\n    grantWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n"): typeof import('./graphql').GrantWorkspaceCreationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeWorkspaceCreation($userId: ID!, $note: String) {\n    revokeWorkspaceCreation(userId: $userId, note: $note) {\n      id\n      canCreateWorkspace\n    }\n  }\n"): typeof import('./graphql').RevokeWorkspaceCreationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PauseAdminRoleChanges {\n    pauseAdminRoleChanges\n  }\n"): typeof import('./graphql').PauseAdminRoleChangesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResumeAdminRoleChanges {\n    resumeAdminRoleChanges\n  }\n"): typeof import('./graphql').ResumeAdminRoleChangesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {\n    setUserRole(userId: $userId, role: $role, note: $note) {\n      id\n      role\n      canCreateWorkspace\n    }\n  }\n"): typeof import('./graphql').SetUserRoleDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
