const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createCorrectAnswer = async () => {
  const correctAnswerData = {
    answerText: 'Mike Judge',
    questionId: '3cef5082-c3a2-44ba-b84d-e686145733dd',
  };

  try {
    const newCorrectAnswer = await prisma.correctAnswer.create({
      data: {
        answer: correctAnswerData.answerText, // Correct answer text
        questionId: correctAnswerData.questionId, // Associated question ID
      },
    });

    console.log('Correct answer created successfully:', newCorrectAnswer);
  } catch (error) {
    console.error('Error creating correct answer:', error);
  } finally {
    await prisma.$disconnect(); // Ensure the Prisma client is properly disconnected
  }
};

createCorrectAnswer();
