import { repository } from "../../../lib/db/repository";
import { assessmentService } from "../../../lib/services/assessment.service";
import { requireRole, requireAuth } from "../middleware/auth";

export async function assessmentsRoute(request: Request, _db?: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!(request as any).user) {
    requireAuth(request);
  }
  const currentUser = (request as any).user;
  const isTeacherOrAdmin = currentUser?.role === "admin" || currentUser?.role === "teacher";

  // GET /api/assessments -> list all assessments and nested questions
  if (request.method === "GET" && path === "/api/assessments") {
    const rawAssessments = await assessmentService.listAssessments();
    
    // Mask correctIndex for student callers to prevent cheating via DevTools
    const assessments = isTeacherOrAdmin
      ? rawAssessments
      : rawAssessments.map((a) => ({
          ...a,
          questions: (a.questions || []).map((q) => {
            const { correctIndex, ...studentSafeQ } = q;
            return studentSafeQ;
          }),
        }));

    return new Response(JSON.stringify({ assessments }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/assessments -> create assessment
  if (request.method === "POST" && path === "/api/assessments") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const assessment = await assessmentService.createAssessment(body);
    return new Response(JSON.stringify({ assessment }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/assessments/:id -> update assessment
  if (request.method === "PUT" && path.startsWith("/api/assessments/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/assessments/".length);
    const body = await request.json();
    const assessment = await assessmentService.updateAssessment(id, body);
    return new Response(JSON.stringify({ assessment }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/assessments/:id -> delete assessment
  if (request.method === "DELETE" && path.startsWith("/api/assessments/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/assessments/".length);
    await assessmentService.deleteAssessment(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/questions -> list questions (optionally filter by assessmentId)
  if (request.method === "GET" && path === "/api/questions") {
    const assessmentId = url.searchParams.get("assessmentId");
    const rawQuestions = await repository.getQuestions(assessmentId);

    const questions = isTeacherOrAdmin
      ? rawQuestions
      : rawQuestions.map((q) => {
          const { correctIndex, ...studentSafeQ } = q;
          return studentSafeQ;
        });

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/questions -> create question
  if (request.method === "POST" && path === "/api/questions") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const question = await repository.createQuestion(body);
    return new Response(JSON.stringify({ question }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/questions/batch -> batch create questions
  if (request.method === "POST" && path === "/api/questions/batch") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { assessmentId, questions: qs } = body;
    if (!assessmentId || !Array.isArray(qs)) {
      return new Response(
        JSON.stringify({ error: "assessmentId and questions array are required" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const createdQs = await repository.createQuestionsBatch(assessmentId, qs);
    return new Response(JSON.stringify({ ok: true, questions: createdQs }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/questions/:id -> update question
  if (request.method === "PUT" && path.startsWith("/api/questions/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/questions/".length);
    const body = await request.json();
    const question = await repository.updateQuestion(id, body);
    return new Response(JSON.stringify({ question }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/questions/:id -> delete question
  if (request.method === "DELETE" && path.startsWith("/api/questions/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/questions/".length);
    await repository.deleteQuestion(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/submissions -> list submissions
  if (request.method === "GET" && path === "/api/submissions") {
    const studentId = url.searchParams.get("studentId") || (isTeacherOrAdmin ? undefined : currentUser?.userId);
    const assessmentId = url.searchParams.get("assessmentId");
    const submissions = await repository.getSubmissions(studentId, assessmentId);
    return new Response(JSON.stringify({ submissions }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/submissions -> create a student submission and responses
  if (request.method === "POST" && path === "/api/submissions") {
    const body = await request.json();
    
    // Ensure student cannot forge submissions under other student IDs
    if (!isTeacherOrAdmin && body.studentId && body.studentId !== currentUser?.userId) {
      return new Response(JSON.stringify({ error: "Forbidden: You cannot submit for another student" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    const submission = await assessmentService.submitAssessmentWithGrading(body);

    return new Response(
      JSON.stringify({
        submission,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // PUT /api/submissions/:id/grade -> grade a submission
  if (request.method === "PUT" && path.startsWith("/api/submissions/") && path.endsWith("/grade")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/submissions/".length, -"/grade".length);
    const body = await request.json();
    const result = await assessmentService.gradeAssessmentSubmission(id, body.feedback, body.awards);

    return new Response(
      JSON.stringify(result || { ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // POST /api/reset-submissions -> delete all submissions for a student+assessment
  if (request.method === "POST" && path === "/api/reset-submissions") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { studentId, assessmentId } = body;
    if (!studentId || !assessmentId) {
      return new Response(JSON.stringify({ error: "studentId and assessmentId are required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await repository.resetSubmissions(studentId, assessmentId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
