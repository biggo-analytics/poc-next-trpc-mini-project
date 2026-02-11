import { PrismaClient, UserRole, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing data
  await prisma.comment.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      profile: {
        create: {
          bio: "System administrator",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
          website: "https://example.com",
        },
      },
    },
  });

  const users = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          name: `User ${i + 1}`,
          role: UserRole.USER,
          profile: {
            create: {
              bio: `Bio for user ${i + 1}`,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`,
            },
          },
        },
      })
    )
  );

  console.log(`Created ${users.length + 1} users`);

  // Create Categories
  const categoryData = [
    { name: "Technology", slug: "technology" },
    { name: "Programming", slug: "programming" },
    { name: "Design", slug: "design" },
    { name: "DevOps", slug: "devops" },
    { name: "Database", slug: "database" },
  ];

  const categories = await Promise.all(
    categoryData.map((cat) => prisma.category.create({ data: cat }))
  );

  console.log(`Created ${categories.length} categories`);

  // Create Posts with various statuses
  const allUsers = [adminUser, ...users];
  const statuses = [PostStatus.DRAFT, PostStatus.PUBLISHED, PostStatus.ARCHIVED];

  const posts = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      prisma.post.create({
        data: {
          title: `Sample Post ${i + 1}: ${["Introduction to TypeScript", "Building REST APIs", "Next.js App Router Guide", "PostgreSQL Tips", "Docker for Developers", "TailwindCSS Tricks", "React Hooks Deep Dive", "CI/CD Pipeline Setup", "GraphQL vs REST", "Microservices Architecture", "Testing Strategies", "Clean Code Principles", "AWS Deployment Guide", "Prisma ORM Tutorial", "tRPC Full-Stack TypeScript"][i]}`,
          content: `This is the content for post ${i + 1}. It covers important topics about modern web development. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
          status: statuses[i % 3],
          authorId: allUsers[i % allUsers.length].id,
          categories: {
            create: [
              { categoryId: categories[i % categories.length].id },
              { categoryId: categories[(i + 1) % categories.length].id },
            ],
          },
        },
      })
    )
  );

  console.log(`Created ${posts.length} posts`);

  // Create Comments with nested replies
  for (const post of posts.slice(0, 5)) {
    const comment = await prisma.comment.create({
      data: {
        content: `Great article about "${post.title}"! Very informative.`,
        authorId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
        postId: post.id,
      },
    });

    // Create nested reply
    await prisma.comment.create({
      data: {
        content: "Thanks for the feedback! Glad you found it useful.",
        authorId: allUsers[0].id,
        postId: post.id,
        parentId: comment.id,
      },
    });

    // Create another reply
    await prisma.comment.create({
      data: {
        content: "I agree, this is a well-written piece.",
        authorId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
        postId: post.id,
        parentId: comment.id,
      },
    });
  }

  console.log("Created comments with nested replies");
  console.log("Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
