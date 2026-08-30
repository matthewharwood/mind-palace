# Ava's First 100 Words artwork

The 100 source images in `apps/web/public/ava-first-words/images/` were created with
OpenAI's built-in image-generation tool in generation mode. Ten 5-by-2 sprite sheets
were generated, then mechanically split into WebP cards at quality 84. The generated
image was used only as a style reference for later sheets; it was not a source of
semantic content.

## Shared prompt

> Create one clean 5-by-2 sprite sheet for a toddler's first-words learning game.
> Use a warm, rounded, clay-like 3D children's illustration style, gentle studio
> lighting, soft shadows, pale cream cells, aligned white gutters, consistent scale
> and padding, and one centered isolated subject in every cell. Follow the supplied
> left-to-right, top-to-bottom order exactly. No text, letters, labels, logos,
> watermarks, extra panels, or subjects crossing gutters. Keep every image friendly,
> immediately recognizable, preschool-safe, and readable at small card size.

Each sheet appended one of the following exact subject lists and its category-specific
direction:

| Sheet | Cell order | Additional direction |
| --- | --- | --- |
| Family | mommy, daddy, baby, grandma, grandpa; brother, sister, friend, boy, girl | Warm, diverse family portraits with a single person or clearly readable pair where required. |
| Animals | dog, cat, bird, fish, cow; horse, duck, bunny, bear, frog | Friendly expressions, natural colors, and no scenery or extra props. |
| Food | apple, banana, milk, water, bread; cheese, egg, cookie, juice, peas | Distinct, unlabeled silhouettes: milk bottle, handled water cup, and straw juice box. |
| Body | eyes, nose, mouth, ears, hands; feet, hair, teeth, belly, face | Friendly educational toy-like features, a clothed belly, and no medical imagery or gore. The final correction explicitly replaced socks with rounded bare toy-like child feet. |
| Home | bed, chair, table, door, window; light, bath, book, blanket, phone | Familiar household objects with no room scene competing with the subject. |
| Toys | ball, blocks, doll, teddy bear, car; train, bubbles, puzzle, crayon, drum | Familiar toddler toys with simple, distinct silhouettes. |
| Outside | sun, moon, star, tree, flower; grass, rain, cloud, rock, leaf | Simple nature symbols with no landscape background. |
| Things that go | bus, truck, bicycle, airplane, boat; stroller, wagon, tractor, helicopter, scooter | Side or three-quarter views with distinct vehicle silhouettes and no logos. |
| Actions | eat, drink, sleep, sit, stand; walk, run, jump, clap, hug | One child demonstrating each verb with an unambiguous pose and minimal props. |
| Needs and social | more, all done, yes, no, please; thank you, help, up, down, go | Clear toddler gestures or baby-sign-inspired hand positions, without arrows or written symbols. |

## Crop command

The sheets were divided with ImageMagick's exact grid partitioning:

```sh
magick source.png -crop 5x2@ +repage -quality 84 output-%02d.webp
```

The numbered crops were then renamed to the slugs in the corresponding table row.
